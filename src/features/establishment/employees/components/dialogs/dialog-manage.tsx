import { useEffect, useRef, useState } from "react"
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
import { useSaveEmployeeChanges } from "@/features/establishment/employees/api/mutations/save-employee-changes"
import {
  correoCambio,
  useReactivarPorCambioDeCorreo,
  type CambioCorreoInput,
} from "@/features/establishment/employees/api/mutations/use-reactivar-por-cambio-de-correo"
import { registerFuncionario } from "@/features/establishment/employees/api/mutations/use-register-funcionario"
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
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import {
  computePersonErrors,
  createPermissionDraft,
  EMPLOYEE_FIELD_PREFIX,
  permissionDraftSchema,
  type PermissionDraft,
} from "@/features/establishment/employees/components/dialogs/dialog-manage/schema"
import {
  buildDraftSnapshot,
  buildEmployeeDataSnapshot,
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
  // Resuelve al provider de la página: los avisos previos al cierre van ahí.
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
  const navigate = useNavigate()
  const { data: currentUser } = useUser()
  // El `sub` del JWT es el correo: cambiar el propio obliga a cerrar sesión.
  const logoutMutation = useLogout()
  const [selfEmailChangedDialogOpen, setSelfEmailChangedDialogOpen] = useState(false)
  const isEditMode = Boolean(employeeId)
  /** id del empleado creado en esta sesión; habilita los botones opcionales. */
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
  // Secciones opcionales confirmadas con su Guardar (no con el borrador).
  const [permissionsSaved, setPermissionsSaved] = useState(false)
  const [additionalInfoSaved, setAdditionalInfoSaved] = useState(false)
  // Aviso de invitación del alta; se repite en la página al cerrar.
  const invitationNoticeRef = useRef<ReturnType<typeof employeeInvitationNotice> | null>(null)
  // Foto elegida en el form, todavía sin subir: viaja como `fkTarchivoFoto`
  // del multipart, tanto en el alta (/register/cval/funcionario) como en el PATCH.
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  // Foto subida al crear: el alta no devuelve `pk_tarchivo`.
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null)
  // Funcionario activo encontrado por documento (V51 REV5): el alta pasa a edición.
  const [matchedFuncionarioId, setMatchedFuncionarioId] = useState<number | null>(null)
  // Snapshot del autocompletado cuando hay cuenta sin TFUNCIONARIO, para detectar cambios.
  const personMatchSnapshotRef = useRef<Partial<Person> | null>(null)
  // PK_TSEDE_USUARIO al cargar, para el diff de permisos.
  const originalPermissionIdsRef = useRef<Set<number>>(new Set())
  // Correo original, para saber si cambió al guardar.
  const originalEmailRef = useRef<string | undefined>(undefined)
  // Línea base de lo PERSISTIDO (borrador completo, ficha sola y permisos):
  // decide el botón Guardar, la confirmación al descartar y qué requests
  // manda `saveEmployeeChanges`.
  const cleanSnapshotRef = useRef<string | null>(null)
  const cleanEmployeeDataSnapshotRef = useRef<string | null>(null)
  const cleanPermissionsSnapshotRef = useRef<string>(JSON.stringify([]))
  // Línea base de cada sub-diálogo (lo confirmado en el borrador, aunque
  // todavía no esté guardado): "Cancelar" ahí vuelve a esto.
  const permissionsSnapshotRef = useRef<string>(JSON.stringify([]))
  const additionalInfoSnapshotRef = useRef<string>(JSON.stringify(createInitialAdditionalInfo()))
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  /** Fija lo recién cargado/guardado como línea base de todo el diálogo. */
  function markClean(
    nextPerson: Person,
    nextAdditionalInfo: EmployeeAdditionalInfoValue,
    nextPermissions: Permission[],
  ) {
    cleanSnapshotRef.current = buildDraftSnapshot(nextPerson, nextAdditionalInfo, nextPermissions)
    cleanEmployeeDataSnapshotRef.current = buildEmployeeDataSnapshot(nextPerson, nextAdditionalInfo)
    cleanPermissionsSnapshotRef.current = JSON.stringify(nextPermissions)
    permissionsSnapshotRef.current = JSON.stringify(nextPermissions)
    additionalInfoSnapshotRef.current = JSON.stringify(nextAdditionalInfo)
  }

  function resetCleanSnapshots() {
    cleanSnapshotRef.current = null
    cleanEmployeeDataSnapshotRef.current = null
    cleanPermissionsSnapshotRef.current = JSON.stringify([])
    permissionsSnapshotRef.current = JSON.stringify([])
    additionalInfoSnapshotRef.current = JSON.stringify(createInitialAdditionalInfo())
  }


  /** id efectivo: el de la URL o el creado en esta sesión. */
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
  // El director de grupo se asigna desde el grupo; el back lo rechaza aquí.
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

  /** Vuelca un `Employee` completo sobre el estado del diálogo. */
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
    // La foto guardada no vuelve como `File`; basta `photoArchivoId`.
    setPhoto(null)
    setPhotoRemoved(false)
    setUploadedPhoto(null)
    // Lo que llega del backend ya está guardado: los botones arrancan con
    // el ícono de editar, sin pedir un Guardar que no aplica.
    setPermissionsSaved(employee.permissions.length > 0)
    setAdditionalInfoSaved(hasAdditionalInfoData(loadedAdditionalInfo))
    markClean(loadedPerson, loadedAdditionalInfo, employee.permissions)
  }

  // Deshace la carga de un match por documento sin tocar `person`.
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
    resetCleanSnapshots()
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
    resetCleanSnapshots()
  }

  function closeDialog() {
    if (!isEditMode) {
      resetDraft()
    }
    onOpenChange(false)
  }

  // Cancelar, Escape u overlay: con cambios sin guardar (incluidos los que
  // solo se confirmaron en Permisos o Información complementaria) pide
  // confirmación antes de descartarlos.
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true)
      return
    }
    if (isSavingMain) return
    if (isDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    closeDialog()
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

  // Si la persona ya es funcionario activo (V51 REV5), el alta se trata como edición.
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

  // Guardado único de la edición: PATCH de la ficha + PUT de permisos, cada
  // uno solo si cambió. Los mensajes los arma `handleMainSave`.
  const saveMutation = useSaveEmployeeChanges()

  // `isRegistering` cubre el alta real (`registerFuncionario` no es mutation).
  const [isRegistering, setIsRegistering] = useState(false)
  const isSavingMain =
    isRegistering ||
    createPersonMutation.isPending ||
    createMutation.isPending ||
    saveMutation.isPending ||
    reactivarMutation.isPending

  const hasUnsavedChanges =
    cleanSnapshotRef.current === null ||
    photo !== null ||
    photoRemoved ||
    (person !== null && buildDraftSnapshot(person, additionalInfo, permissions) !== cleanSnapshotRef.current)

  // Para la confirmación al cerrar: en un alta sin guardar todavía se compara
  // contra el borrador vacío (si no, abrir y cerrar sin tocar nada pediría
  // confirmación); en edición, antes de que cargue el detalle, `person` sigue
  // vacío y tampoco cuenta como cambio.
  const isDirty =
    photo !== null ||
    photoRemoved ||
    (person !== null &&
      buildDraftSnapshot(person, additionalInfo, permissions) !==
        (cleanSnapshotRef.current ??
          buildDraftSnapshot(createEmptyPerson(), createInitialAdditionalInfo(), [])))

  const hasPermissionsChanges = JSON.stringify(permissions) !== permissionsSnapshotRef.current
  const hasAdditionalInfoChanges = JSON.stringify(additionalInfo) !== additionalInfoSnapshotRef.current

  async function handleMainSave() {
    const draft = person as Person | null

    if (!draft) {
      notify("No hay datos del usuario para guardar.", { variant: "error" })
      return
    }

    // 1) Garantizar que la persona exista; el correo se limpia de invisibles.
    let persistedPerson: Person = { ...draft, email: toEmailInput(draft.email ?? "") }

    const nextErrors = computePersonErrors(persistedPerson, photo)

    if (Object.keys(nextErrors).length > 0) {
      setPersonErrors(nextErrors)
      return
    }

    if (!persistedPerson.id) {
      setPersonErrors({})

      if (!env.ENABLE_API_MOCKING && !activeEmployeeId) {
        // Real: /register/cval/funcionario crea TUSUARIO + TFUNCIONARIO (V51 REV5).
        setIsRegistering(true)
        try {
          const registered = await registerFuncionario(persistedPerson, photo)
          persistedPerson = { ...persistedPerson, id: registered.pkFuncionario }

          // `fn_fun_crear` reusa el TUSUARIO: si el form cambió, se encadena un PATCH.
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
          // No se invalida `["employees"]` hasta asignar permisos; se actualiza el snapshot.
          markClean(persistedPerson, additionalInfo, permissions)
          setUploadedPhoto(photo)
          setPhoto(null)
          setPhotoRemoved(false)
          // Sin contraseña: el backend manda la activación (ver `employeeInvitationNotice`).
          const invitation = employeeInvitationNotice({
            ...registered,
            email: registered.email || persistedPerson.email,
          })
          invitationNoticeRef.current = invitation
          notify(invitation.message, { variant: invitation.variant })
        } catch (error) {
          // getErrorMessage lee response.data.message, no el genérico de axios.
          notify(getErrorMessage(error) || "No fue posible registrar el funcionario.", {
            variant: "error",
          })
        } finally {
          setIsRegistering(false)
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

    // 2) Solo mock: crear el empleado si aún no existe.
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

      // Las siguientes llamadas pasan por PUT.
      setCreatedEmployeeId(result.employee.id ?? null)
      markClean(persistedPerson, additionalInfo, permissions)
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

    // Editar: UN solo guardado (PATCH de la ficha si cambió + PUT de permisos
    // si cambiaron, ver `saveEmployeeChanges`). El correo se compara sin mayúsculas.
    const employeeDataChanged =
      photo !== null ||
      photoRemoved ||
      buildEmployeeDataSnapshot(persistedPerson, additionalInfo) !== cleanEmployeeDataSnapshotRef.current
    const selfEmailChanged = Boolean(
      employeeDataChanged &&
        isEditMode &&
        currentUser?.email &&
        originalEmailRef.current &&
        toEmailInput(originalEmailRef.current).toLowerCase() === toEmailInput(currentUser.email).toLowerCase() &&
        toEmailInput(persistedPerson.email).toLowerCase() !== toEmailInput(originalEmailRef.current).toLowerCase(),
    )
    const cambioCorreo: CambioCorreoInput | null =
      employeeDataChanged && isEditMode && correoCambio(originalEmailRef.current, persistedPerson.email)
        ? { correoAnterior: toEmailInput(originalEmailRef.current ?? ""), correoNuevo: toEmailInput(persistedPerson.email) }
        : null

    let result: Awaited<ReturnType<typeof saveMutation.mutateAsync>>
    try {
      result = await saveMutation.mutateAsync({
        employeeId: activeEmployeeId,
        values: payload,
        employeeDataChanged,
        originalPermissionIds: originalPermissionIdsRef.current,
        permissionsChanged: JSON.stringify(permissions) !== cleanPermissionsSnapshotRef.current,
        foto: photo,
        removePhoto: photoRemoved,
      })
    } catch (error) {
      // Falló el PATCH (o el PUT en mock): no se guardó nada.
      notify(getErrorMessage(error) || "No fue posible actualizar el funcionario.", { variant: "error" })
      return
    }

    if (result.status === "error") {
      notify(result.message, { variant: "error" })
      return
    }

    // Lo que ya quedó persistido pasa a ser la nueva línea base (si falla el
    // PUT de permisos, reintentar no vuelve a mandar el PATCH ni el correo).
    const nextPermissions = result.permissions?.permissions ?? permissions
    if (result.permissions) {
      setPermissions(nextPermissions)
      originalPermissionIdsRef.current = result.permissions.originalPermissionIds
    }
    const permissionsFullySaved = !result.permissionsError && !(result.permissions?.failures.length)
    setPerson(persistedPerson)
    cleanEmployeeDataSnapshotRef.current = buildEmployeeDataSnapshot(persistedPerson, additionalInfo)
    if (permissionsFullySaved) {
      markClean(persistedPerson, additionalInfo, nextPermissions)
    } else {
      // Los permisos siguen pendientes: la base conserva los permisos de antes
      // para que el diálogo quede sucio (Guardar visible) y se pueda reintentar.
      cleanSnapshotRef.current = buildDraftSnapshot(
        persistedPerson,
        additionalInfo,
        JSON.parse(cleanPermissionsSnapshotRef.current),
      )
      additionalInfoSnapshotRef.current = JSON.stringify(additionalInfo)
      permissionsSnapshotRef.current = JSON.stringify(nextPermissions)
    }
    if (result.patched) {
      originalEmailRef.current = persistedPerson.email
      if (photo) setUploadedPhoto(photo)
      setPhoto(null)
      setPhotoRemoved(false)
    }

    // El cambio de correo se notifica una sola vez, después del guardado.
    let activacionMsg: string | null = null
    let activacionError: string | null = null
    if (cambioCorreo) {
      try {
        await reactivarMutation.mutateAsync(cambioCorreo)
        activacionMsg = `Se envió el correo de activación a ${cambioCorreo.correoNuevo}.`
      } catch (error) {
        activacionError = `No fue posible enviar el correo de activación: ${
          getErrorMessage(error) || "error desconocido"
        }`
      }
    }

    // Correo propio cambiado: el aviso de cierre de sesión reemplaza al normal.
    if (selfEmailChanged) {
      setSelfEmailChangedDialogOpen(true)
      return
    }

    if (!permissionsFullySaved) {
      const failures = result.permissions?.failures ?? []
      const detalle = result.permissionsError
        ? getErrorMessage(result.permissionsError) || "No fue posible actualizar los permisos."
        : `No se pudieron guardar ${failures.length} permiso(s): ${failures.join(", ")}.`
      const mensaje = [result.patched ? "Datos del funcionario guardados." : null, detalle, activacionError]
        .filter(Boolean)
        .join(" ")
      notify(mensaje, { variant: "error" })
      return
    }

    if (activacionError) {
      notifyPage(`${SUCCESS_MESSAGES.employee.updated} ${activacionError}`, { variant: "error" })
      onOpenChange(false)
      return
    }

    // En creación también pasa por acá: se distingue el mensaje y el aviso de invitación.
    const invitation = isEditMode ? null : invitationNoticeRef.current
    if (invitation && !activacionMsg) {
      notifyPage(invitation.message, { variant: invitation.variant })
      onOpenChange(false)
      return
    }
    const base = isEditMode ? SUCCESS_MESSAGES.employee.updated : SUCCESS_MESSAGES.employee.created
    notifyPage(activacionMsg ? `${base} ${activacionMsg}` : base)
    onOpenChange(false)
  }

  /** "Entendido" (o cierre): cierra sesión, no hay cancelar real. */
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
      // Un mensaje por campo (el primer issue).
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

  // Por referencia: el orden solo es único por (rol, sede) (UK_TSEDE_USUARIO_2).
  function removePermission(removed: Permission) {
    setPermissions((current) => current.filter((permission) => permission !== removed))

    notify(`Permiso de ${removed.role.name} en ${removed.campus.name} eliminado.`)
  }

  /**
   * Solo confirma el borrador: no llama a la API. Las altas/bajas viajan en el
   * PUT /funcionario/:ID/permisos que manda "Guardar" (`saveEmployeeChanges`).
   * `cleanSnapshotRef` no se toca, así el diálogo principal sigue sucio (botón
   * Guardar visible y confirmación al descartar).
   */
  async function closePermissionsDialog() {
    setPermissionsSaved(true)
    setPermissionsDialogOpen(false)
    permissionsSnapshotRef.current = JSON.stringify(permissions)
    notify("Permisos agregados al borrador. Pulsa Guardar para persistir el funcionario.", { variant: "info" })
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

  /**
   * Solo confirma el borrador: no llama a la API. Antes mandaba su propio PATCH
   * y "Guardar" otro (dos escrituras y dos notificaciones APP_ACCION por una
   * misma edición); ahora todo sale en el único PATCH de `handleMainSave`.
   */
  async function closeAdditionalInfoDialog() {
    setAdditionalInfoSaved(true)
    setAdditionalInfoDialogOpen(false)
    additionalInfoSnapshotRef.current = JSON.stringify(additionalInfo)
    notify("Información complementaria agregada al borrador. Pulsa Guardar para persistir el funcionario.", { variant: "info" })
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
                  // Ya es funcionario activo: lo carga `matchedEmployeeQuery`.
                  setMatchedFuncionarioId(found.id)
                  personMatchSnapshotRef.current = null
                } else {
                  // Solo existe la cuenta: guarda el snapshot y limpia cargas previas.
                  personMatchSnapshotRef.current = found ?? null
                  // Si venía de otro match, también se deshace lo que cargó.
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
        isSaving={false}
      />

      <AdditionalInfoDialog
        open={additionalInfoDialogOpen}
        onOpenChange={handleAdditionalInfoDialogOpenChange}
        value={additionalInfo}
        onChange={setAdditionalInfo}
        hasChanges={hasAdditionalInfoChanges}
        onSave={closeAdditionalInfoDialog}
        isSaving={false}
      />

      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          closeDialog()
        }}
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
