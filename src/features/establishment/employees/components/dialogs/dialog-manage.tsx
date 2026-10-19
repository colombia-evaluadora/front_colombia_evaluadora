import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CheckIcon,
  ControlPointIcon,
  PencilIcon,
  XIcon,
} from "@/components/ui/icons"
import { toSelectOptions } from "@/lib/catalog-options"
import { employeeInvitationNotice, SUCCESS_MESSAGES } from "@/lib/success-messages"
import { getErrorMessage } from "@/lib/api-client"
import { env } from "@/config/env"
import { paths } from "@/config/paths"
import { useLogout, useUser } from "@/lib/auth"

import { useCreate } from "@/features/establishment/employees/api/mutations/use-create"
import { useCreateWithPerson } from "@/features/establishment/employees/api/mutations/use-create-with-person"
import { update as updateFuncionario } from "@/features/establishment/employees/api/mutations/update"
import { useUpdate } from "@/features/establishment/employees/api/mutations/use-update"
import {
  correoCambio,
  useReactivarPorCambioDeCorreo,
  type CambioCorreoInput,
} from "@/features/establishment/employees/api/mutations/use-reactivar-por-cambio-de-correo"
import { registerFuncionario } from "@/features/establishment/employees/api/mutations/use-register-funcionario"
import {
  toCrearItem,
  updateEmployeePermissions,
  type PermissionSyncItem,
} from "@/features/establishment/employees/api/mutations/update-permissions"
import { useCampusesOptionsQuery } from "@/features/establishment/campuses/api/query/use-campuses-options"
import {
  useSedeJornadasActivasQuery,
  useSedeTienePeriodosQuery,
} from "@/features/establishment/employees/api/query/use-sede-jornadas"
import { useEmployeeQuery } from "@/features/establishment/employees/api/query/use-employee"
import { useEmployeeRolesQuery } from "@/features/establishment/employees/api/query/use-employee-roles"
import type { Campus } from "@/features/establishment/campuses/api/types/campus"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { useAsistenteFuncionario } from "@/features/establishment/employees/hooks/use-asistente-funcionario"
import type { Employee } from "@/features/establishment/employees/api/types/employee"
import type { Permission } from "@/features/establishment/institution/api/types/permission"
import { personDataChangedSinceMatch, type Person } from "@/features/establishment/employees/api/types/person"
import { createAdditionalInfoFromEmployee, type EmployeeAdditionalInfoValue } from "@/features/establishment/employees/components/forms/form-employee-additional-info"
import { UserDetailsForm } from "@/features/establishment/employees/components/forms/form-user-details"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { toEmailInput } from "@/lib/text-input"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"
import {
  computePersonErrors,
  createPermissionDraft,
  EMPLOYEE_FIELD_PREFIX,
  permissionDraftSchema,
  type PermissionDraft,
} from "@/features/establishment/employees/components/dialogs/dialog-manage/schema"
import {
  buildDraftSnapshot,
  buildEmployeeStatus,
  createEmptyPerson,
  createInitialAdditionalInfo,
  DIRECTOR_GRUPO_ROLE_CODE,
  hasAdditionalInfoData,
} from "@/features/establishment/employees/components/dialogs/dialog-manage/helpers"
import { PermissionsDialog } from "@/features/establishment/employees/components/dialogs/dialog-manage/permissions-dialog"
import { AdditionalInfoDialog } from "@/features/establishment/employees/components/dialogs/dialog-manage/additional-info-dialog"
import { SelfEmailChangedDialog } from "@/features/establishment/employees/components/dialogs/dialog-manage/self-email-changed-dialog"

interface ManageEmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId?: number | null
}

export function ManageEmployeeDialog(props: ManageEmployeeDialogProps) {
  // `useNotify` ACÁ (fuera del `NoticeProvider` propio del diálogo) resuelve
  // al provider de la página. Los avisos que se emiten justo antes de cerrar
  // el diálogo tienen que ir ahí: si van al provider del diálogo quedan en un
  // `NoticeOutlet` que desaparece con el cierre y el usuario no ve nada (así
  // se perdía "Funcionario actualizado" y el aviso del correo de activación).
  const { notify: notifyPage } = useNotify()
  return (
    <NoticeProvider>
      <ManageEmployeeDialogContent {...props} notifyPage={notifyPage} />
    </NoticeProvider>
  )
}

function ManageEmployeeDialogContent({
  open,
  onOpenChange,
  employeeId,
  notifyPage,
}: ManageEmployeeDialogProps & { notifyPage: ReturnType<typeof useNotify>["notify"] }) {
  const { notify, dismiss } = useNotify()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: currentUser } = useUser()
  // El `sub` del JWT (y por lo tanto `AuthUser.email`/`.id`) ES el correo:
  // si este guardado edita al usuario actualmente autenticado y le cambia
  // el correo, el próximo `POST /auth/refresh` ya no encuentra a ese `sub`
  // en la base (user_not_found) — la sesión queda viva unos minutos más
  // por el token en memoria, hasta que algo dispara un refresh. Se cierra
  // la sesión de forma controlada en vez de dejar que eso pase en silencio.
  const logoutMutation = useLogout()
  const [selfEmailChangedDialogOpen, setSelfEmailChangedDialogOpen] = useState(false)
  const isEditMode = Boolean(employeeId)
  /**
   * id del empleado recién creado en esta sesión. Mientras está vacío no
   * se han hecho llamadas a POST/PUT /employees; cuando se llena, el diálogo
   * habilita los botones opcionales (permisos / información complementaria)
   * y `handleMainSave` pasa a usar PUT /employees/:id.
   */
  const [createdEmployeeId, setCreatedEmployeeId] = useState<number | null>(null)

  const [person, setPerson] = useState<Person | null>(createEmptyPerson())
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [additionalInfo, setAdditionalInfo] = useState<EmployeeAdditionalInfoValue>(
    createInitialAdditionalInfo
  )

  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [additionalInfoDialogOpen, setAdditionalInfoDialogOpen] = useState(false)
  const [permissionDraft, setPermissionDraft] = useState<PermissionDraft>(createPermissionDraft)
  // Mensaje por campo del borrador de permiso, indexado por su nombre.
  const [permissionErrors, setPermissionErrors] = useState<Record<string, string>>({})
  // Ídem para los datos de la persona, con las rutas de `UserDetailsForm`.
  const [personErrors, setPersonErrors] = useState<Record<string, string>>({})
  /*
   * Secciones opcionales ya confirmadas con su botón Guardar. Es lo que decide
   * qué botón se ve y con qué ícono, y va aparte de los datos a propósito:
   * agregar una fila a la tabla —o escribir en el formulario— todavía no
   * cuenta, recién el Guardar del diálogo lo hace. Cancelar deja el estado
   * como estaba.
   */
  const [permissionsSaved, setPermissionsSaved] = useState(false)
  const [additionalInfoSaved, setAdditionalInfoSaved] = useState(false)
  // Aviso de invitación del alta (correo de activación enviado o no). Se
  // muestra en el diálogo apenas se registra y se repite en la página al
  // cerrar con el Guardar final, que es lo último que ve el usuario.
  const invitationNoticeRef = useRef<ReturnType<typeof employeeInvitationNotice> | null>(null)
  // Foto elegida en el form, todavía sin subir: viaja como `fkTarchivoFoto`
  // del multipart, tanto en el alta (/register/cval/funcionario) como en el PATCH.
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  // La foto que ya se subió al crear. `photo` se limpia tras guardar —si no,
  // el formulario queda sucio para siempre— pero el alta no devuelve el
  // `pk_tarchivo`, así que sin esto la vista previa se vacía y parece que la
  // foto no se guardó. Se reemplaza por la de verdad al reabrir en edición.
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null)
  // PK_TFUNCIONARIO que devolvió el autocompletado por documento cuando la
  // persona YA es funcionario activo (`fn_fun_activo_por_usuario`, V51 REV5
  // — ver `use-user-by-document.ts`). Dispara el efecto de abajo, que carga
  // el registro completo y trata el resto del diálogo como edición desde
  // ya (habilita Permisos/Información complementaria sin esperar al primer
  // Guardar) — con TFUNCIONARIO como una fila por persona, si ya existe uno
  // activo, dar de alta ES editarlo, sea cual sea el establecimiento en el
  // que se lo esté buscando.
  const [matchedFuncionarioId, setMatchedFuncionarioId] = useState<number | null>(null)
  // Snapshot crudo del autocompletado (antes del placeholder de
  // contraseña) cuando SÍ existe la cuenta pero todavía NO hay
  // TFUNCIONARIO (`matchedFuncionarioId` se queda en null en ese caso).
  // `fn_fun_crear` reusa el TUSUARIO tal cual estaba: si el usuario corrige
  // algo del form antes de guardar, `handleMainSave` compara contra esto
  // para saber si hace falta encadenar un PATCH además del alta (ver
  // `personDataChangedSinceMatch`).
  const personMatchSnapshotRef = useRef<Partial<Person> | null>(null)
  // Snapshot de los `id` (PK_TSEDE_USUARIO) que ya existían al abrir/cargar
  // el diálogo. Real-mode-only: el guardado de permisos compara `permissions`
  // contra este set para armar el diff crear/eliminar que espera
  // PUT /funcionario/:ID/permisos — ver closePermissionsDialog.
  const originalPermissionIdsRef = useRef<Set<number>>(new Set())
  const [isSavingPermissions, setIsSavingPermissions] = useState(false)
  // Correo con el que se cargó este funcionario al abrir el diálogo —
  // `person.email` ya lo pisa el formulario apenas el usuario lo edita, así
  // que sin esto no hay forma de saber si el correo CAMBIÓ al guardar.
  const originalEmailRef = useRef<string | undefined>(undefined)
  // Se arma en `handleMainSave`, antes de guardar, y lo lee el `onSuccess`
  // de `updateMutation`: si el correo editado es el de la sesión actual Y
  // cambió de verdad, dispara el aviso de cierre de sesión en vez del
  // mensaje normal de "funcionario actualizado".
  const selfEmailJustChangedRef = useRef(false)
  const cleanSnapshotRef = useRef<string | null>(null)
  const permissionsSnapshotRef = useRef<string>(JSON.stringify([]))
  const additionalInfoSnapshotRef = useRef<string>(JSON.stringify(createInitialAdditionalInfo()))



  /**
   * id efectivo del empleado: el de la URL en edición, o el recién creado
   * durante esta sesión del diálogo. Mientras sea null, significa que la
   * persona todavía no está enlazada a un empleado.
   */
  const activeEmployeeId = isEditMode ? (employeeId ?? null) : createdEmployeeId
  const canOpenOptionalSections = Boolean(activeEmployeeId)

  // UI asistida: el agente puede rellenar/limpiar/señalar campos y abrir los
  // sub-diálogos, nunca guardar (ver `use-asistente-funcionario.ts`).
  useAsistenteFuncionario({
    open,
    employeeId,
    person,
    setPerson,
    additionalInfo,
    setAdditionalInfo,
    abrirPermisos: () => {
      if (canOpenOptionalSections) setPermissionsDialogOpen(true)
    },
    abrirInformacionAdicional: () => {
      if (canOpenOptionalSections) setAdditionalInfoDialogOpen(true)
    },
  })

  const employeeQuery = useEmployeeQuery(employeeId ?? null, open && isEditMode)
  const { data: roles = [] } = useEmployeeRolesQuery()
  const { data: campuses = [] } = useCampusesOptionsQuery()
  // El director de grupo se asigna y se quita desde el grupo (el back lo
  // rechaza aquí): no se ofrece en el select, aunque el catálogo lo traiga
  // porque el filtro por rol del listado sí lo necesita.
  const roleItems = toSelectOptions(roles.filter((role) => role.code !== DIRECTOR_GRUPO_ROLE_CODE))
  const campusItems = toSelectOptions(campuses)
  const {
    data: sedeJornadas = [],
    isPending: isLoadingSedeJornadas,
  } = useSedeJornadasActivasQuery(permissionDraft.campusId)
  const { data: sedeTienePeriodos } = useSedeTienePeriodosQuery(permissionDraft.campusId)
  const workSchedules: CatalogItem[] = sedeJornadas.map((j) => ({
    id: j.id,
    code: String(j.id),
    name: j.nombre,
  }))
  const workScheduleItems = toSelectOptions(workSchedules)
  const workScheduleEmptyMessage =
    permissionDraft.campusId == null
      ? "Elige primero la sede educativa."
      : sedeTienePeriodos === false
        ? "Esta sede todavía no tiene ningún periodo académico creado. Crea uno primero."
        : "Esta sede no tiene un periodo académico activo con jornada configurada."
  const workScheduleEmptyShortMessage =
    sedeTienePeriodos === false ? "Sin periodos académicos" : "Sin jornada activa"

  // Revalida en cada cambio tras un intento de guardar fallido, para que el
  // borde rojo desaparezca apenas el campo queda completo.
  useEffect(() => {
    if (Object.keys(personErrors).length === 0) return
    setPersonErrors(computePersonErrors(person, photo))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `personErrors` es guard, no dep.
  }, [person, photo])

  /**
   * Vuelca un `Employee` completo sobre todo el estado del diálogo — lo
   * comparten el efecto de edición normal (`employeeQuery`) y el de "ya es
   * funcionario activo" (`matchedEmployeeQuery`, ver más abajo): en ambos
   * casos el diálogo termina mostrando exactamente lo mismo, solo cambia
   * cómo se llegó al `id`.
   */
  function applyLoadedEmployee(employee: Employee) {
    const loadedPerson = { ...employee.person, accountExists: true }
    const loadedAdditionalInfo = createAdditionalInfoFromEmployee(employee)

    originalEmailRef.current = employee.person.email
    setPerson(loadedPerson)
    setPermissions(employee.permissions)
    originalPermissionIdsRef.current = new Set(
      employee.permissions
        .map((permission) => permission.id)
        .filter((id): id is number => id !== undefined),
    )
    setAdditionalInfo(loadedAdditionalInfo)
    setPermissionDraft(createPermissionDraft(employee.permissions.length + 1))
    setPermissionErrors({})
    setPersonErrors({})
    // La foto guardada no vuelve como `File`: se arranca sin nada elegido y
    // solo se manda si el usuario carga una nueva. Acá sí llega el
    // `photoArchivoId`, así que la vista previa local ya no hace falta.
    setPhoto(null)
    setPhotoRemoved(false)
    setUploadedPhoto(null)
    // Lo que llega del backend ya está guardado: los botones arrancan con
    // el ícono de editar, sin pedir un Guardar que no aplica.
    setPermissionsSaved(employee.permissions.length > 0)
    setAdditionalInfoSaved(hasAdditionalInfoData(loadedAdditionalInfo))
    cleanSnapshotRef.current = buildDraftSnapshot(loadedPerson, loadedAdditionalInfo, employee.permissions)
    permissionsSnapshotRef.current = JSON.stringify(employee.permissions)
    additionalInfoSnapshotRef.current = JSON.stringify(loadedAdditionalInfo)
  }

  // Deshace lo que `applyLoadedEmployee` cargó al matchear un funcionario
  // activo por documento -- SIN tocar `person`, que ya
  // se está reescribiendo aparte (`UserDetailsForm` dispara esto al detectar
  // que el documento cambió tras el match, `form-user-details.tsx`). Sin
  // esto, `createdEmployeeId` quedaba apuntando al funcionario equivocado:
  // "Permisos"/"Información complementaria" seguían habilitados y
  // `handleMainSave` tomaba la rama de edición (PUT) en vez de crear a la
  // persona nueva que el usuario terminó tipeando.
  function unmatchEmployee() {
    setMatchedFuncionarioId(null)
    setCreatedEmployeeId(null)
    setPermissions([])
    setAdditionalInfo(createInitialAdditionalInfo())
    setPermissionDraft(createPermissionDraft())
    setPermissionErrors({})
    setPermissionsSaved(false)
    setAdditionalInfoSaved(false)
    originalPermissionIdsRef.current = new Set()
    cleanSnapshotRef.current = null
    permissionsSnapshotRef.current = JSON.stringify([])
    additionalInfoSnapshotRef.current = JSON.stringify(createInitialAdditionalInfo())
  }

  function resetDraft() {
    setUploadedPhoto(null)
    setPerson(createEmptyPerson())
    setPermissions([])
    setAdditionalInfo(createInitialAdditionalInfo())
    setPermissionDraft(createPermissionDraft())
    setPermissionErrors({})
    setPersonErrors({})
    setPhoto(null)
    setPhotoRemoved(false)
    invitationNoticeRef.current = null
    setCreatedEmployeeId(null)
    setPermissionsSaved(false)
    setAdditionalInfoSaved(false)
    setMatchedFuncionarioId(null)
    personMatchSnapshotRef.current = null
    originalPermissionIdsRef.current = new Set()
    cleanSnapshotRef.current = null
    permissionsSnapshotRef.current = JSON.stringify([])
    additionalInfoSnapshotRef.current = JSON.stringify(createInitialAdditionalInfo())
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !isEditMode) {
      resetDraft()
    }
    onOpenChange(nextOpen)
  }

  useEffect(() => {
    if (!open) {
      return
    }

    dismiss()

    if (!isEditMode) {
      resetDraft()
      return
    }

    if (employeeQuery.data?.status === "ok") {
      applyLoadedEmployee(employeeQuery.data.employee)
    }
  }, [employeeQuery.data, isEditMode, open])

  // El autocompletado por documento (`UserDetailsForm`, `onMatched` más
  // abajo) puede encontrar que la persona YA es funcionario activo
  // (`found.id`, ver `use-user-by-document.ts`/V51 REV5) — en ese caso el
  // alta se trata como edición de ese registro desde ya: se carga completo
  // y se habilitan Permisos/Información complementaria sin esperar al
  // primer Guardar (mismo criterio que pide el negocio: si ya sabemos que
  // se va a asignar permisos/editar info de alguien que ya existe, no tiene
  // sentido fingir que es un alta nueva).
  const matchedEmployeeQuery = useEmployeeQuery(
    matchedFuncionarioId,
    open && !isEditMode && matchedFuncionarioId !== null,
  )

  useEffect(() => {
    if (!open || isEditMode || matchedFuncionarioId === null) return

    if (matchedEmployeeQuery.data?.status === "ok") {
      applyLoadedEmployee(matchedEmployeeQuery.data.employee)
      setCreatedEmployeeId(matchedFuncionarioId)
    }
  }, [matchedEmployeeQuery.data, isEditMode, open, matchedFuncionarioId])

  const createPersonMutation = useCreateWithPerson({
    mutationConfig: {
      onError: (error) => {
        notify(getErrorMessage(error) || "No fue posible guardar el usuario.", {
          variant: "error",
        })
      },
    },
  })

  const createMutation = useCreate({
    mutationConfig: {
      onError: (error) => {
        notify(getErrorMessage(error) || "No fue posible crear el funcionario.", {
          variant: "error",
        })
      },
    },
  })

  const reactivarMutation = useReactivarPorCambioDeCorreo()
  // Se arma en `handleMainSave` (modo edición, correo realmente cambiado) y
  // lo consume el `onSuccess` de `updateMutation`.
  const emailChangeRef = useRef<CambioCorreoInput | null>(null)

  const updateMutation = useUpdate({
    mutationConfig: {
      onSuccess: async (result) => {
        if (result.status === "error") {
          emailChangeRef.current = null
          notify(result.message, { variant: "error" })
          return
        }

        // Guardó bien un correo propio distinto del que trae la sesión
        // actual: el aviso de cierre de sesión REEMPLAZA al mensaje y
        // cierre normales (no los dos) — el diálogo sigue montado para
        // mostrar el modal bloqueante.
        // Correo cambiado: la cuenta SSO vuelve a "pendiente de activación" y
        // se envía el correo de activación al correo nuevo. Va DESPUÉS del
        // guardado porque el backend valida que el cambio ya esté aplicado.
        const cambioCorreo = emailChangeRef.current
        emailChangeRef.current = null
        let activacionMsg: string | null = null
        if (cambioCorreo) {
          try {
            await reactivarMutation.mutateAsync(cambioCorreo)
            activacionMsg = `Se envió el correo de activación a ${cambioCorreo.correoNuevo}.`
          } catch (error) {
            selfEmailJustChangedRef.current = false
            notifyPage(
              `${SUCCESS_MESSAGES.employee.updated} No fue posible enviar el correo de activación: ${
                getErrorMessage(error) || "error desconocido"
              }`,
              { variant: "error" },
            )
            onOpenChange(false)
            return
          }
        }

        if (selfEmailJustChangedRef.current) {
          selfEmailJustChangedRef.current = false
          setSelfEmailChangedDialogOpen(true)
          return
        }

        // En modo creación este guardado final también pasa por PUT (una vez
        // ya existe `activeEmployeeId`), así que hay que distinguir el mensaje
        // acá: el funcionario se está creando por primera vez.
        // Si en este alta se mandó (o falló) la invitación de activación, ese
        // es el aviso que tiene que quedar a la vista al cerrar.
        const invitation = isEditMode ? null : invitationNoticeRef.current
        if (invitation && !activacionMsg) {
          notifyPage(invitation.message, { variant: invitation.variant })
          onOpenChange(false)
          return
        }
        const base = isEditMode ? SUCCESS_MESSAGES.employee.updated : SUCCESS_MESSAGES.employee.created
        notifyPage(activacionMsg ? `${base} ${activacionMsg}` : base)
        onOpenChange(false)
      },
      onError: (error) => {
        notify(getErrorMessage(error) || "No fue posible actualizar el funcionario.", {
          variant: "error",
        })
      },
    },
  })

  const updateAdditionalInfoMutation = useUpdate({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }

        notify("Información complementaria actualizada.")
        additionalInfoSnapshotRef.current = JSON.stringify(additionalInfo)
        if (person) {
          cleanSnapshotRef.current = buildDraftSnapshot(person, additionalInfo, permissions)
        }
        setAdditionalInfoSaved(true)
        setAdditionalInfoDialogOpen(false)
      },
      onError: (error) => {
        notify(getErrorMessage(error) || "No fue posible actualizar la información complementaria.", {
          variant: "error",
        })
      },
    },
  })

  const isSavingMain =
    createPersonMutation.isPending ||
    createMutation.isPending ||
    updateMutation.isPending

  const hasUnsavedChanges =
    cleanSnapshotRef.current === null ||
    photo !== null ||
    photoRemoved ||
    (person !== null && buildDraftSnapshot(person, additionalInfo, permissions) !== cleanSnapshotRef.current)

  const hasPermissionsChanges = JSON.stringify(permissions) !== permissionsSnapshotRef.current
  const hasAdditionalInfoChanges = JSON.stringify(additionalInfo) !== additionalInfoSnapshotRef.current

  async function handleMainSave() {
    const draft = person as Person | null

    if (!draft) {
      notify("No hay datos del usuario para guardar.", { variant: "error" })
      return
    }

    // 1) Garantizar que la persona exista (POST /person en mock;
    //    POST /register/cval/funcionario en real — ver más abajo, ese además
    //    ya crea el TFUNCIONARIO, así que el flujo real se bifurca acá).
    // El correo se limpia de caracteres invisibles también acá: si el valor
    // vino sucio de la base y no se tocó el input, igual se guarda limpio.
    let persistedPerson: Person = { ...draft, email: toEmailInput(draft.email ?? "") }

    const nextErrors = computePersonErrors(persistedPerson, photo)

    if (Object.keys(nextErrors).length > 0) {
      setPersonErrors(nextErrors)
      return
    }

    if (!persistedPerson.id) {
      setPersonErrors({})

      if (!env.ENABLE_API_MOCKING && !activeEmployeeId) {
        // Backend real: /register/cval/funcionario (auth-center, Java) crea
        // TUSUARIO + TFUNCIONARIO (`fn_fun_crear` reusa el TUSUARIO si
        // `accountExists` era `true`). TFUNCIONARIO ya no es una fila por
        // establecimiento, así que no hace falta indicar a cuál pertenece
        // ni enlazarlo después — el select de EE y el paso de "enlazar"
        // (`fn_fun_enlazar_establecimiento`) quedaron obsoletos con este
        // cambio de modelo (ver V51 REV5).
        try {
          const registered = await registerFuncionario(persistedPerson, photo)
          persistedPerson = { ...persistedPerson, id: registered.pkFuncionario }

          // `fn_fun_crear` reusó el TUSUARIO tal cual estaba cuando
          // `accountExists` era `true` — si el usuario corrigió algo del
          // form respecto a lo que trajo el autocompletado antes de
          // guardar, esa corrección todavía no llegó al backend. Se
          // encadena un PATCH aparte solo si de verdad cambió algo.
          const snapshot = personMatchSnapshotRef.current
          if (snapshot && personDataChangedSinceMatch(snapshot, persistedPerson)) {
            await updateFuncionario(
              registered.pkFuncionario,
              {
                id: registered.pkFuncionario,
                person: persistedPerson,
                employeeClass: additionalInfo.employeeClass,
                educationLevel: additionalInfo.educationLevel,
                grade: additionalInfo.grade,
                highestEducationLevel: additionalInfo.highestEducationLevel,
                fundingSource: additionalInfo.fundingSource,
                functionalPosition: additionalInfo.functionalPosition,
                employmentType: additionalInfo.employmentType,
                address: additionalInfo.address,
                permissions,
                status: buildEmployeeStatus(permissions),
              },
              photo,
            )
          }

          setPerson(persistedPerson)
          setCreatedEmployeeId(registered.pkFuncionario)
          // A propósito NO se invalida `["employees"]` acá: el funcionario
          // recién creado todavía no tiene ningún permiso asignado, así que
          // no debe aparecer en la tabla hasta que se le asigne al menos
          // uno (ver `closePermissionsDialog`, que sí invalida al guardar
          // permisos).
          // Deja el "borrador limpio" al día con lo que ya se persistió --
          // mismo criterio que `applyLoadedEmployee` en edición. Sin esto
          // el botón "Guardar" quedaba habilitado para siempre después de
          // crear, aunque no hubiera ningún cambio nuevo sin guardar.
          cleanSnapshotRef.current = buildDraftSnapshot(persistedPerson, additionalInfo, permissions)
          setUploadedPhoto(photo)
          setPhoto(null)
          setPhotoRemoved(false)
          // Sin contraseña en el alta: el backend manda el correo de
          // activación (o reusa una cuenta activa, y entonces no hay
          // invitación que anunciar) — ver `employeeInvitationNotice`.
          const invitation = employeeInvitationNotice({
            ...registered,
            email: registered.email || persistedPerson.email,
          })
          invitationNoticeRef.current = invitation
          notify(invitation.message, { variant: invitation.variant })
        } catch (error) {
          // getErrorMessage y no error.message: un AxiosError ES un Error, y su
          // .message es el generico de axios ("Request failed with status code
          // 400"). El texto que explica el problema -- el correo mal formado, por
          // ejemplo -- viene en response.data.message, que es lo que este lee.
          notify(getErrorMessage(error) || "No fue posible registrar el funcionario.", {
            variant: "error",
          })
        }
        return
      }

      const result = await createPersonMutation.mutateAsync(persistedPerson)

      if (result.status === "error") {
        notify(result.message, { variant: "error" })
        return
      }

      persistedPerson = result.person
      setPerson(result.person)
    }

    // 2) Garantizar que el empleado exista en employeesDb vinculado a la
    // persona. Si todavía no hay un id de empleado (primer guardado en
    // creación o nuevo ingreso durante esta sesión), llamamos POST
    // /employees con catálogos vacíos si el usuario no entró ni permisos
    // ni información complementaria. A partir de ese momento los botones
    // opcionales quedan disponibles sin cerrar el diálogo.
    // (Solo mock: en real, este paso ya lo cubrió /register/cval/funcionario
    // arriba — no hay un POST /employees separado.)
    const payload: Employee = {
      // Sin `id` cuando todavía no existe: lo asigna el backend al crear.
      id: activeEmployeeId ?? undefined,
      person: persistedPerson,
      employeeClass: additionalInfo.employeeClass,
      educationLevel: additionalInfo.educationLevel,
      grade: additionalInfo.grade,
      highestEducationLevel: additionalInfo.highestEducationLevel,
      fundingSource: additionalInfo.fundingSource,
      functionalPosition: additionalInfo.functionalPosition,
      employmentType: additionalInfo.employmentType,
      address: additionalInfo.address,
      permissions,
      status: buildEmployeeStatus(permissions),
    }

    if (!activeEmployeeId) {
      const result = await createMutation.mutateAsync(payload)

      if (result.status === "error") {
        notify(result.message, { variant: "error" })
        return
      }

      // Fijamos el id del empleado recién creado para que las próximas
      // invocaciones a handleMainSave pasen por PUT, y habilitamos los
      // botones opcionales sin cerrar el diálogo.
      setCreatedEmployeeId(result.employee.id ?? null)
      // Mismo criterio que en el alta real: deja el snapshot al día para
      // que "Guardar" se oculte hasta que haya un cambio de verdad.
      cleanSnapshotRef.current = buildDraftSnapshot(persistedPerson, additionalInfo, permissions)
      setUploadedPhoto(photo)
      setPhoto(null)
      setPhotoRemoved(false)
      notify(
        permissions.length === 0
          ? "Usuario guardado. Puedes asignar permisos e información complementaria."
          : "Funcionario guardado."
      )
      return
    }

    // Empleado ya enlazado: editamos con PUT.
    // Comparación sin importar mayúsculas: el correo es case-insensitive
    // tanto para el login como para el `sub` del JWT.
    selfEmailJustChangedRef.current = Boolean(
      isEditMode &&
        currentUser?.email &&
        originalEmailRef.current &&
        toEmailInput(originalEmailRef.current).toLowerCase() === toEmailInput(currentUser.email).toLowerCase() &&
        toEmailInput(persistedPerson.email).toLowerCase() !== toEmailInput(originalEmailRef.current).toLowerCase(),
    )
    emailChangeRef.current =
      isEditMode && correoCambio(originalEmailRef.current, persistedPerson.email)
        ? { correoAnterior: toEmailInput(originalEmailRef.current ?? ""), correoNuevo: toEmailInput(persistedPerson.email) }
        : null
    await updateMutation.mutateAsync({
      employeeId: activeEmployeeId,
      values: payload,
      foto: photo,
      removePhoto: photoRemoved,
    })
    setPhotoRemoved(false)
  }

  /**
   * Botón "Entendido" del modal de "correo propio actualizado" — y también
   * lo que corre si alguien lo cierra por otra vía (Escape/backdrop):
   * quedarse logueado con un token que ya no resuelve en el backend es
   * justo el estado roto que este aviso previene, así que no hay un
   * "cancelar" real acá.
   */
  async function handleConfirmSelfEmailChanged() {
    setSelfEmailChangedDialogOpen(false)
    onOpenChange(false)
    await logoutMutation.mutateAsync(undefined)
    navigate({ to: paths.auth.login.path })
  }

  function findCampusById(campusId: number): Campus | undefined {
    return campuses.find((campus) => campus.id === campusId)
  }

  function addPermission() {
    const parsed = permissionDraftSchema.safeParse(permissionDraft)

    if (!parsed.success) {
      // Un mensaje por campo, debajo del input que hay que corregir. Se guarda
      // el primer issue de cada ruta porque ahí solo cabe una línea.
      const nextErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".")
        nextErrors[path] ??= issue.message
      }
      setPermissionErrors(nextErrors)
      return
    }

    setPermissionErrors({})
    const draft = parsed.data

    const role = roles.find((item) => item.id === draft.roleId)
    const campus = findCampusById(draft.campusId)
    const workSchedule = workSchedules.find((item) => item.id === draft.workScheduleId)

    if (!role || !campus || !workSchedule) {
      notify("No fue posible resolver los datos del permiso seleccionado.", { variant: "error" })
      return
    }

    const sameRoleAndCampus = permissions.filter(
      (permission) => permission.role.id === role.id && permission.campus.id === campus.id,
    )
    if (sameRoleAndCampus.some((permission) => permission.workSchedule.id === workSchedule.id)) {
      notify(
        `Ya existe un permiso de ${role.name} en ${campus.name} con la jornada ${workSchedule.name}.`,
        { variant: "error" },
      )
      return
    }
    if (sameRoleAndCampus.some((permission) => permission.order === Number(draft.order))) {
      notify(
        `Ya existe un permiso de ${role.name} en ${campus.name} con el orden ${draft.order}.`,
        { variant: "error" },
      )
      return
    }

    const nextPermission: Permission = {
      order: Number(draft.order),
      role,
      campus,
      workSchedule,
      status: draft.status,
    }

    setPermissions((current) => [...current, nextPermission])
    setPermissionDraft(createPermissionDraft(permissions.length + 2))
    notify(`Permiso de ${role.name} en ${campus.name} agregado.`)
  }

  // Se quita por referencia, no por orden: el orden solo es único por
  // (rol, sede) (UK_TSEDE_USUARIO_2), así que filtrar por él se llevaba
  // todos los permisos con el mismo número y "Guardar" los daba de baja.
  function removePermission(removed: Permission) {
    setPermissions((current) => current.filter((permission) => permission !== removed))

    notify(`Permiso de ${removed.role.name} en ${removed.campus.name} eliminado.`)
  }

  /**
   * En mock, los permisos siguen viajando embebidos en el payload general
   * del empleado (comportamiento original, sin cambios) — acá solo se
   * confirma el borrador.
   *
   * En real, este es el punto que la propia `fn_fun_permisos_actualizar`
   * espera como su único caller: `fn_fun_actualizar` ya no acepta lista de
   * permisos, así que el "Guardar" de este sub-diálogo llama directo a
   * PUT /funcionario/:ID/permisos con el diff contra
   * `originalPermissionIdsRef` — altas (permisos sin `id`, agregados en
   * este borrador) y bajas (`id`s que ya no están en `permissions`). No
   * soporta "editar" un permiso existente (mismo límite que la función
   * SQL): si alguien cambia el orden de un permiso ya persistido sin
   * agregarlo/quitarlo, ese cambio de orden no se sincroniza.
   */
  async function closePermissionsDialog() {
    if (env.ENABLE_API_MOCKING || !activeEmployeeId) {
      setPermissionsSaved(true)
      setPermissionsDialogOpen(false)
      permissionsSnapshotRef.current = JSON.stringify(permissions)
      if (person) cleanSnapshotRef.current = buildDraftSnapshot(person, additionalInfo, permissions)
      notify("Permisos agregados al borrador. Pulsa Guardar para persistir el funcionario.", { variant: "info" })
      return
    }

    const currentIds = new Set(
      permissions.map((permission) => permission.id).filter((id): id is number => id !== undefined),
    )
    const toDelete = [...originalPermissionIdsRef.current].filter((id) => !currentIds.has(id))
    const toCreate = permissions.filter((permission) => permission.id === undefined)

    if (toDelete.length === 0 && toCreate.length === 0) {
      setPermissionsSaved(true)
      setPermissionsDialogOpen(false)
      permissionsSnapshotRef.current = JSON.stringify(permissions)
      if (person) cleanSnapshotRef.current = buildDraftSnapshot(person, additionalInfo, permissions)
      return
    }

    setIsSavingPermissions(true)
    try {
      const items: PermissionSyncItem[] = [
        ...toDelete.map((id): PermissionSyncItem => ({ accion: "eliminar", id })),
        ...toCreate.map(toCrearItem),
      ]
      const results = await updateEmployeePermissions(activeEmployeeId, items)

      // Los `id` que la BD asignó a las altas vuelven en el mismo orden en
      // que se mandaron los "crear" — se emparejan por posición para que el
      // borrador ya quede con `id` y no se re-manden como altas la próxima
      // vez que se abra "Guardar".
      const createdIds = results.filter((row) => row.accion === "crear").map((row) => row.id)
      let createdIndex = 0
      const nextPermissions = permissions.map((permission) => {
        if (permission.id !== undefined) return permission
        const id = createdIds[createdIndex]
        createdIndex += 1
        return id === undefined ? permission : { ...permission, id }
      })
      setPermissions(nextPermissions)
      originalPermissionIdsRef.current = new Set([...currentIds, ...createdIds])
      permissionsSnapshotRef.current = JSON.stringify(nextPermissions)
      if (person) cleanSnapshotRef.current = buildDraftSnapshot(person, additionalInfo, nextPermissions)
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all })
      void queryClient.invalidateQueries({ queryKey: academicPeriodKeys.assignmentTeachers.all })

      setPermissionsSaved(true)
      setPermissionsDialogOpen(false)
      notify("Permisos actualizados.")
    } catch (error) {
      notify(getErrorMessage(error) || "No fue posible actualizar los permisos.", {
        variant: "error",
      })
    } finally {
      setIsSavingPermissions(false)
    }
  }

  function handlePermissionsDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      const savedPermissions: Permission[] = JSON.parse(permissionsSnapshotRef.current)
      setPermissions(savedPermissions)
      setPermissionDraft(createPermissionDraft(savedPermissions.length + 1))
      setPermissionErrors({})
    }
    setPermissionsDialogOpen(nextOpen)
  }

  async function closeAdditionalInfoDialog() {
    if (env.ENABLE_API_MOCKING || !activeEmployeeId || !person) {
      setAdditionalInfoSaved(true)
      setAdditionalInfoDialogOpen(false)
      additionalInfoSnapshotRef.current = JSON.stringify(additionalInfo)
      notify("Información complementaria agregada al borrador. Pulsa Guardar para persistir el funcionario.", { variant: "info" })
      return
    }

    await updateAdditionalInfoMutation.mutateAsync({
      employeeId: activeEmployeeId,
      values: {
        id: activeEmployeeId,
        person,
        employeeClass: additionalInfo.employeeClass,
        educationLevel: additionalInfo.educationLevel,
        grade: additionalInfo.grade,
        highestEducationLevel: additionalInfo.highestEducationLevel,
        fundingSource: additionalInfo.fundingSource,
        functionalPosition: additionalInfo.functionalPosition,
        employmentType: additionalInfo.employmentType,
        address: additionalInfo.address,
        permissions,
        status: buildEmployeeStatus(permissions),
      },
      foto: null,
    })
  }

  function handleAdditionalInfoDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setAdditionalInfo(JSON.parse(additionalInfoSnapshotRef.current))
    }
    setAdditionalInfoDialogOpen(nextOpen)
  }

  const mainTitle = isEditMode ? "Editar funcionario" : "Agregar funcionario"

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="flex w-[min(95vw,56rem)] max-w-none sm:max-w-224 max-h-[85vh] flex-col overflow-hidden p-0"
          showCloseButton={false}
        >
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle>{mainTitle}</DialogTitle>
          </DialogHeader>

          {/* Único bloque con scroll: header y footer quedan fijos afuera —
              antes `overflow-y-auto` vivía en el `DialogContent` entero, así
              que scrollear el form se llevaba el título y los botones con él. */}
          <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6">
            <NoticeOutlet className="mb-2" />

            <UserDetailsForm
              value={person}
              onChange={setPerson}
              fieldPrefix={EMPLOYEE_FIELD_PREFIX}
              errors={personErrors}
              invalidFields={Object.keys(personErrors)}
              showValidation
              photo={photo}
              uploadedPhoto={uploadedPhoto}
              onPhotoChange={(file) => {
                setPhoto(file)
                if (file) setPhotoRemoved(false)
              }}
              onRemovePhoto={() => {
                setPhotoRemoved(true)
                setUploadedPhoto(null)
              }}
              onMatched={(found) => {
                if (found?.id) {
                  // Ya es funcionario activo -- el efecto de arriba
                  // (`matchedEmployeeQuery`) lo carga completo y trata el
                  // resto del diálogo como edición.
                  setMatchedFuncionarioId(found.id)
                  personMatchSnapshotRef.current = null
                } else {
                  // Solo existe la cuenta (o no hay match): guarda el
                  // snapshot para poder detectar ediciones antes de guardar
                  // (ver el bloque de `personDataChangedSinceMatch` en
                  // `handleMainSave`), y limpia cualquier carga anterior.
                  personMatchSnapshotRef.current = found ?? null
                  // Si veníamos de un match a otro funcionario (el usuario
                  // corrigió el documento porque no era la persona que
                  // quería), hay que deshacer también lo que ese match cargó
                  // -- no solo `matchedFuncionarioId`.
                  if (matchedFuncionarioId !== null) {
                    unmatchEmployee()
                  } else {
                    setMatchedFuncionarioId(null)
                  }
                }
              }}
            />
          </div>

          {/* `sm:justify-between` y no solo `justify-between`: el `DialogFooter`
              trae `sm:justify-end` propio y, al ser una clase con variante,
              `twMerge` no la funde con la pelada — sin el `sm:` los dos grupos
              se iban juntos a la derecha en escritorio. */}
          <DialogFooter className="shrink-0 px-6 pb-6 flex-row flex-wrap items-center justify-between gap-3 sm:justify-between">
            {/*
              Los dos accesos opcionales se recorren en orden: permisos primero
              y, solo cuando ya hay al menos uno, aparece la información
              complementaria. Cada botón cuenta en qué punto está con su ícono:
              el "+" en círculo de los listados (`ControlPointIcon`) mientras la
              sección está vacía, y el lápiz de las tablas cuando ya tiene datos
              —entrar deja de ser agregar y pasa a ser editar—.
            */}
            <div className="flex flex-wrap items-center gap-2">
              {canOpenOptionalSections && (
                <Button
                  variant="fill"
                  color="primary"
                  size="sm"
                  onClick={() => setPermissionsDialogOpen(true)}
                >
                  {permissionsSaved ? (
                    <PencilIcon data-icon="inline-start" />
                  ) : (
                    <ControlPointIcon data-icon="inline-start" />
                  )}
                  {permissionsSaved ? `Permisos / ${permissions.length}` : "Permisos"}
                </Button>
              )}

              {canOpenOptionalSections && permissionsSaved && (
                <Button
                  variant="fill"
                  color="primary"
                  size="sm"
                  onClick={() => setAdditionalInfoDialogOpen(true)}
                >
                  {additionalInfoSaved ? (
                    <PencilIcon data-icon="inline-start" />
                  ) : (
                    <ControlPointIcon data-icon="inline-start" />
                  )}
                  Información complementaria
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasUnsavedChanges && !permissionsDialogOpen && !additionalInfoDialogOpen && (
                <Button
                  variant="fill"
                  color="primary"
                  size="sm"
                  onClick={() => void handleMainSave()}
                  disabled={isSavingMain}
                >
                  <CheckIcon data-icon="inline-start" />
                  {isSavingMain ? "Guardando..." : "Guardar"}
                </Button>
              )}
              <Button
                variant="fill"
                color="neutral"
                size="sm"
                onClick={() => handleOpenChange(false)}
                disabled={isSavingMain}
              >
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PermissionsDialog
        open={permissionsDialogOpen}
        onOpenChange={handlePermissionsDialogOpenChange}
        permissionDraft={permissionDraft}
        onDraftChange={setPermissionDraft}
        permissionErrors={permissionErrors}
        roleItems={roleItems}
        campusItems={campusItems}
        workScheduleItems={workScheduleItems}
        isLoadingSedeJornadas={isLoadingSedeJornadas}
        workScheduleEmptyMessage={workScheduleEmptyMessage}
        workScheduleEmptyShortMessage={workScheduleEmptyShortMessage}
        permissions={permissions}
        onAdd={addPermission}
        onRemove={removePermission}
        hasChanges={hasPermissionsChanges}
        onSave={closePermissionsDialog}
        isSaving={isSavingPermissions}
      />

      <AdditionalInfoDialog
        open={additionalInfoDialogOpen}
        onOpenChange={handleAdditionalInfoDialogOpenChange}
        value={additionalInfo}
        onChange={setAdditionalInfo}
        hasChanges={hasAdditionalInfoChanges}
        onSave={closeAdditionalInfoDialog}
        isSaving={updateAdditionalInfoMutation.isPending}
      />

      {/* Bloqueante a propósito: no hay "Cancelar" — ver el comentario de
          `handleConfirmSelfEmailChanged`. */}
      <SelfEmailChangedDialog
        open={selfEmailChangedDialogOpen}
        onConfirm={handleConfirmSelfEmailChanged}
        isPending={logoutMutation.isPending}
      />
    </>
  )
}
