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
  const queryClient = useQueryClient()
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
  const [isSavingPermissions, setIsSavingPermissions] = useState(false)
  // Correo original, para saber si cambió al guardar.
  const originalEmailRef = useRef<string | undefined>(undefined)
  // Lo lee `onSuccess`: si cambió el correo propio, avisa cierre de sesión.
  const selfEmailJustChangedRef = useRef(false)
  const cleanSnapshotRef = useRef<string | null>(null)
  const permissionsSnapshotRef = useRef<string>(JSON.stringify([]))
  const additionalInfoSnapshotRef = useRef<string>(JSON.stringify(createInitialAdditionalInfo()))



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
    cleanSnapshotRef.current = buildDraftSnapshot(loadedPerson, loadedAdditionalInfo, employee.permissions)
    permissionsSnapshotRef.current = JSON.stringify(employee.permissions)
    additionalInfoSnapshotRef.current = JSON.stringify(loadedAdditionalInfo)
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

        // Correo propio cambiado: el aviso de cierre reemplaza al normal; luego se reenvía la activación.
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

        // En creación también pasa por PUT: se distingue el mensaje y el aviso de invitación.
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
          cleanSnapshotRef.current = buildDraftSnapshot(persistedPerson, additionalInfo, permissions)
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

    // Editar con PUT; el correo se compara sin mayúsculas.
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

  /** Mock: confirma el borrador. Real: diff altas/bajas a PUT /funcionario/:ID/permisos. */
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

      // Una fila por ítem, en el mismo orden: `status` "error:..." si esa fila falló.
      const fallo = (index: number) => results[index]?.status?.startsWith("error:") ?? true
      const fallidas = results.filter((row) => row.status?.startsWith("error:")).map((row) => row.status.slice(6).replaceAll("_", " "))
      const deletesFallidos = toDelete.filter((_, i) => fallo(i))
      // Las altas exitosas quedan con su `id`; las fallidas siguen sin `id` y se reintentan.
      const createdIds: number[] = []
      let createIndex = toDelete.length
      const nextPermissions = permissions.map((permission) => {
        if (permission.id !== undefined) return permission
        const index = createIndex
        createIndex += 1
        if (fallo(index)) return permission
        createdIds.push(results[index].id)
        return { ...permission, id: results[index].id }
      })
      setPermissions(nextPermissions)
      originalPermissionIdsRef.current = new Set([...currentIds, ...createdIds, ...deletesFallidos])
      permissionsSnapshotRef.current = JSON.stringify(nextPermissions)
      if (person) cleanSnapshotRef.current = buildDraftSnapshot(person, additionalInfo, nextPermissions)
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all })
      void queryClient.invalidateQueries({ queryKey: academicPeriodKeys.assignmentTeachers.all })

      if (fallidas.length > 0) {
        notify(`No se pudieron guardar ${fallidas.length} permiso(s): ${fallidas.join(", ")}.`, {
          variant: "error",
        })
        return
      }

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
