import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  CheckIcon,
  ControlPointIcon,
  PencilIcon,
  TrashIcon,
  XIcon,
} from "@/components/ui/icons"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  TableSortableHeader,
  compareBySortKey,
  type TableSort,
} from "@/components/table-sort-header"
import { CATALOGS } from "@/lib/catalogs"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { cn } from "@/lib/utils"

import { useCreateEmployee } from "../../api/mutations/use-create-employee"
import { useCreateEmployeePerson } from "../../api/mutations/use-create-employee-person"
import { useUpdateEmployee } from "../../api/mutations/use-update-employee"
import { useCampusesOptionsQuery } from "../../api/query/use-campuses-options-query"
import { useCatalogQuery } from "../../api/query/use-catalogs"
import { useEmployeeQuery } from "../../api/query/use-employee-query"
import type { Campus } from "../../api/types/campus"
import type { CatalogItem } from "../../api/types/catalog"
import type {
  Employee,
  EmployeeStatus,
} from "../../api/types/employee"
import type { Permission, PermissionStatus } from "../../api/types/permission"
import type { Person } from "../../api/types/person"
import {
  createAdditionalInfoFromEmployee,
  EmployeeAdditionalInfoForm,
  type EmployeeAdditionalInfoValue,
} from "../forms/form-employee-additional-info"
import { UserDetailsForm } from "../forms/form-user-datails"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"

interface ManageEmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId?: string | null
}

interface PermissionDraft {
  order: string
  roleCode: string
  campusId: string
  workScheduleCode: string
  status: PermissionStatus | ""
}

/**
 * ¿La información complementaria trae algo? Se usa al abrir el diálogo en modo
 * edición: si el funcionario ya llega con estos datos del backend, la sección
 * cuenta como guardada.
 */
function hasAdditionalInfoData(value: EmployeeAdditionalInfoValue): boolean {
  return Boolean(
    value.address.trim() ||
      value.employeeClass.id ||
      value.educationLevel.id ||
      value.grade.id ||
      value.highestEducationLevel.id ||
      value.fundingSource.id ||
      value.functionalPosition.id ||
      value.employmentType.id,
  )
}

/** Columnas por las que se puede ordenar la tabla de permisos. */
type PermissionSortKey = "order" | "role" | "campus" | "workSchedule" | "status"

/** El valor plano por el que ordena cada columna (los catálogos son objetos). */
function permissionSortValue(permission: Permission, key: PermissionSortKey): unknown {
  switch (key) {
    case "order":
      return permission.order
    case "role":
      return permission.role.name
    case "campus":
      return permission.campus.name
    case "workSchedule":
      return permission.workSchedule.name
    case "status":
      return permission.status
  }
}

/*
 * Columna de acciones al estilo de `DataTable` y de la tabla de escalas de
 * valoración: la celda es `sticky` y de 1px —los botones son absolutos, su
 * min-content es 0— y el `spacer` que va justo antes es quien le reserva el
 * ancho en el flujo, para que no se lleve una tajada del reparto.
 */
const PERMISSION_ACTIONS_CELL_CLASS = "sticky right-0 z-10 w-px"
const PERMISSION_ACTIONS_SPACER_WIDTH = 96

const PERMISSION_ACTIONS_SPACER_CELL = (
  <td aria-hidden className="p-0">
    <div style={{ width: PERMISSION_ACTIONS_SPACER_WIDTH }} />
  </td>
)

const PERMISSION_ACTIONS_SPACER_HEAD = (
  <th aria-hidden className="p-0">
    <div style={{ width: PERMISSION_ACTIONS_SPACER_WIDTH }} />
  </th>
)

/*
 * El bloque va a sangre contra el borde derecho, con el alto completo de la
 * fila, y aparece con el mismo fade que el hover. El fondo es el color del
 * hover de `TableRow` (`bg-muted/50`) ya resuelto: acá hace falta opaco porque
 * tapa las columnas que pasan por debajo al scrollear, y se mezcla contra
 * `--popover` —la tabla vive dentro de un Dialog—.
 */
const permissionActionsOverlayClass = () =>
  cn(
    "absolute inset-y-0 right-0 z-10 flex items-center gap-1 px-2 transition-opacity",
    "bg-[color-mix(in_srgb,var(--muted)_50%,var(--popover))]",
    "opacity-0 group-hover/row:opacity-100 group-has-[:focus-visible]/row:opacity-100",
  )

function createEmptyCatalogItem(): CatalogItem {
  return { id: "", code: "", name: "" }
}

function createEmptyPerson(): Person {
  return {
    id: "",
    documentType: createEmptyCatalogItem(),
    identification: "",
    firstName: "",
    middleName: "",
    lastName: "",
    secondLastName: "",
    birthDate: "",
    gender: createEmptyCatalogItem(),
    email: "",
    phone: "",
    password: "",
  }
}

function createInitialAdditionalInfo(): EmployeeAdditionalInfoValue {
  return {
    employeeClass: createEmptyCatalogItem(),
    educationLevel: createEmptyCatalogItem(),
    grade: createEmptyCatalogItem(),
    highestEducationLevel: createEmptyCatalogItem(),
    fundingSource: createEmptyCatalogItem(),
    functionalPosition: createEmptyCatalogItem(),
    employmentType: createEmptyCatalogItem(),
    address: "",
  }
}

function isPersonMinComplete(person: Person | null) {
  if (!person) {
    return false
  }

  return Boolean(
    person.documentType.id &&
      person.identification.trim() &&
      person.firstName.trim() &&
      person.lastName.trim()
  )
}

function createPermissionDraft(nextOrder = 1): PermissionDraft {
  return {
    order: String(nextOrder),
    roleCode: "",
    campusId: "",
    workScheduleCode: "",
    status: "",
  }
}

function buildEmployeeStatus(permissions: Permission[]): EmployeeStatus {
  return permissions.some((permission) => permission.status === "ACTIVE")
    ? "ACTIVE"
    : "SUSPENDED"
}

// Comparte el `NoticeProvider` del padre (la tabla) para que el aviso de
// guardado exitoso siga visible en la vista general tras cerrar el diálogo,
// igual que ocurre con el borrado. Solo los mensajes de los sub-diálogos de
// permisos/información complementaria se ven mientras el diálogo sigue abierto.
export function ManageEmployeeDialog({ open, onOpenChange, employeeId }: ManageEmployeeDialogProps) {
  const { notify } = useNotify()
  const isEditMode = Boolean(employeeId)
  /**
   * id del empleado recién creado en esta sesión. Mientras está vacío no
   * se han hecho llamadas a POST/PUT /employees; cuando se llena, el diálogo
   * habilita los botones opcionales (permisos / información complementaria)
   * y `handleMainSave` pasa a usar PUT /employees/:id.
   */
  const [createdEmployeeId, setCreatedEmployeeId] = useState<string | null>(null)

  const [person, setPerson] = useState<Person | null>(createEmptyPerson())
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [additionalInfo, setAdditionalInfo] = useState<EmployeeAdditionalInfoValue>(
    createInitialAdditionalInfo
  )

  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [additionalInfoDialogOpen, setAdditionalInfoDialogOpen] = useState(false)
  const [permissionDraft, setPermissionDraft] = useState<PermissionDraft>(createPermissionDraft)
  // Orden de la tabla de permisos: estado local, la tabla se arma a mano.
  const [permissionSort, setPermissionSort] = useState<TableSort<PermissionSortKey>>(null)
  /*
   * Secciones opcionales ya confirmadas con su botón Guardar. Es lo que decide
   * qué botón se ve y con qué ícono, y va aparte de los datos a propósito:
   * agregar una fila a la tabla —o escribir en el formulario— todavía no
   * cuenta, recién el Guardar del diálogo lo hace. Cancelar deja el estado
   * como estaba.
   */
  const [permissionsSaved, setPermissionsSaved] = useState(false)
  const [additionalInfoSaved, setAdditionalInfoSaved] = useState(false)
  // Estado UI: vive fuera de `Person` porque no es parte del modelo de negocio.
  const [confirmPassword, setConfirmPassword] = useState("")

  const sortedPermissions = useMemo(() => {
    if (!permissionSort) return permissions
    const { key, dir } = permissionSort
    const sorted = [...permissions].sort((a, b) =>
      compareBySortKey(permissionSortValue(a, key), permissionSortValue(b, key)),
    )
    return dir === "desc" ? sorted.reverse() : sorted
  }, [permissions, permissionSort])

  /**
   * id efectivo del empleado: el de la URL en edición, o el recién creado
   * durante esta sesión del diálogo. Mientras sea null, significa que la
   * persona todavía no está enlazada a un empleado.
   */
  const activeEmployeeId = isEditMode ? (employeeId ?? null) : createdEmployeeId
  const canOpenOptionalSections = Boolean(activeEmployeeId)

  const employeeQuery = useEmployeeQuery(employeeId ?? null, open && isEditMode)
  const { data: roles = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYEE_ROLES)
  const { data: workSchedules = [] } = useCatalogQuery<CatalogItem>(CATALOGS.WORK_SCHEDULES)
  const { data: entityStatuses = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ENTITY_STATUSES)
  const { data: campuses = [] } = useCampusesOptionsQuery()

  const roleItems = roles.map((role) => ({ value: role.code, label: role.name }))
  const campusItems = campuses.map((campus) => ({ value: campus.id, label: campus.name }))
  const workScheduleItems = workSchedules.map((schedule) => ({ value: schedule.code, label: schedule.name }))
  const permissionStatusItems = entityStatuses.map((status: CatalogItem) => ({ value: status.id, label: status.name }))

  useEffect(() => {
    if (!open) {
      return
    }

    if (!isEditMode) {
      setPerson(createEmptyPerson())
      setPermissions([])
      setAdditionalInfo(createInitialAdditionalInfo())
      setPermissionDraft(createPermissionDraft())
      setConfirmPassword("")
      setCreatedEmployeeId(null)
      setPermissionsSaved(false)
      setAdditionalInfoSaved(false)
      return
    }

    if (employeeQuery.data?.status === "ok") {
      const employee = employeeQuery.data.employee
      setPerson(employee.person)
      setPermissions(employee.permissions)
      setAdditionalInfo(createAdditionalInfoFromEmployee(employee))
      setPermissionDraft(createPermissionDraft(employee.permissions.length + 1))
      setConfirmPassword(employee.person.password)
      // En edición lo que llega del backend ya está guardado: los botones
      // arrancan con el ícono de editar, sin pedir un Guardar que no aplica.
      setPermissionsSaved(employee.permissions.length > 0)
      setAdditionalInfoSaved(hasAdditionalInfoData(createAdditionalInfoFromEmployee(employee)))
    }
  }, [employeeQuery.data, isEditMode, open])

  const createPersonMutation = useCreateEmployeePerson({
    mutationConfig: {
      onError: (error) => {
        notify(error.message || "No fue posible guardar el usuario.", { variant: "error" })
      },
    },
  })

  const createEmployeeMutation = useCreateEmployee({
    mutationConfig: {
      onError: (error) => {
        notify(error.message || "No fue posible crear el funcionario.", { variant: "error" })
      },
    },
  })

  const updateEmployeeMutation = useUpdateEmployee({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }

        // En modo creación este guardado final también pasa por PUT (una vez
        // ya existe `activeEmployeeId`), así que hay que distinguir el mensaje
        // acá: el funcionario se está creando por primera vez.
        notify(isEditMode ? SUCCESS_MESSAGES.employee.updated : SUCCESS_MESSAGES.employee.created)
        onOpenChange(false)
      },
      onError: (error) => {
        notify(error.message || "No fue posible actualizar el funcionario.", { variant: "error" })
      },
    },
  })

  const isSavingMain =
    createPersonMutation.isPending ||
    createEmployeeMutation.isPending ||
    updateEmployeeMutation.isPending

  async function handleMainSave() {
    const draft = person as Person | null

    if (!draft) {
      notify("No hay datos del usuario para guardar.", { variant: "error" })
      return
    }

    // 1) Garantizar que la persona exista en personsDb (POST /person)
    let persistedPerson = draft

    if (!persistedPerson.id) {
      if (!isPersonMinComplete(persistedPerson)) {
        notify(
          "Completa los datos mínimos del usuario (tipo de documento, número, primer nombre y primer apellido).",
          { variant: "error" }
        )
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
    const payload: Employee = {
      id: activeEmployeeId ?? `employee-${Date.now()}`,
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
      const result = await createEmployeeMutation.mutateAsync(payload)

      if (result.status === "error") {
        notify(result.message, { variant: "error" })
        return
      }

      // Fijamos el id del empleado recién creado para que las próximas
      // invocaciones a handleMainSave pasen por PUT, y habilitamos los
      // botones opcionales sin cerrar el diálogo.
      setCreatedEmployeeId(result.employee.id)
      notify(
        permissions.length === 0
          ? "Usuario guardado. Puedes asignar permisos e información complementaria."
          : "Funcionario guardado."
      )
      return
    }

    // Empleado ya enlazado: editamos con PUT.
    await updateEmployeeMutation.mutateAsync({
      employeeId: activeEmployeeId,
      values: payload,
    })
  }

  function findCampusById(campusId: string): Campus | undefined {
    return campuses.find((campus) => campus.id === campusId)
  }

  function addPermission() {
    const parsedOrder = Number(permissionDraft.order)

    if (
      !permissionDraft.order.trim() ||
      !Number.isInteger(parsedOrder) ||
      parsedOrder <= 0 ||
      !permissionDraft.roleCode ||
      !permissionDraft.campusId ||
      !permissionDraft.workScheduleCode ||
      !permissionDraft.status
    ) {
      notify("Completa los campos obligatorios del permiso.", { variant: "error" })
      return
    }

    const role = roles.find((item) => item.code === permissionDraft.roleCode)
    const campus = findCampusById(permissionDraft.campusId)
    const workSchedule = workSchedules.find((item) => item.code === permissionDraft.workScheduleCode)

    if (!role || !campus || !workSchedule) {
      notify("No fue posible resolver los datos del permiso seleccionado.", { variant: "error" })
      return
    }

    const nextPermission: Permission = {
      order: parsedOrder,
      role,
      campus,
      workSchedule,
      status: permissionDraft.status,
    }

    setPermissions((current) => [...current, nextPermission])
    setPermissionDraft(createPermissionDraft(permissions.length + 2))
  }

  function removePermission(order: number) {
    setPermissions((current) =>
      current
        .filter((permission) => permission.order !== order)
        .map((permission, index) => ({ ...permission, order: index + 1 }))
    )
  }

  function closePermissionsDialog() {
    setPermissionsSaved(true)
    setPermissionsDialogOpen(false)
    notify("Permisos agregados al borrador. Pulsa Guardar para persistir el funcionario.", { variant: "info" })
  }

  function closeAdditionalInfoDialog() {
    setAdditionalInfoSaved(true)
    setAdditionalInfoDialogOpen(false)
    notify("Información complementaria agregada al borrador. Pulsa Guardar para persistir el funcionario.", { variant: "info" })
  }

  const mainTitle = isEditMode ? "Editar usuario" : "Agregar usuario"

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-[min(95vw,56rem)] max-w-none sm:max-w-224 max-h-[85vh] overflow-y-auto overflow-x-hidden"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>{mainTitle}</DialogTitle>
          </DialogHeader>

          <NoticeOutlet className="mb-2" />

          <UserDetailsForm
            value={person}
            onChange={setPerson}
            confirmPassword={confirmPassword}
            onConfirmPasswordChange={setConfirmPassword}
          />

          {/* `sm:justify-between` y no solo `justify-between`: el `DialogFooter`
              trae `sm:justify-end` propio y, al ser una clase con variante,
              `twMerge` no la funde con la pelada — sin el `sm:` los dos grupos
              se iban juntos a la derecha en escritorio. */}
          <DialogFooter className="flex-row flex-wrap items-center justify-between gap-3 sm:justify-between">
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
              <Button
                variant="fill"
                color="neutral"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSavingMain}
              >
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent
          className="w-[min(98vw,70rem)] max-w-none sm:max-w-280 max-h-[92vh] overflow-y-auto overflow-x-hidden"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>Asignar permisos</DialogTitle>
          </DialogHeader>

          <NoticeOutlet className="mb-2" />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field orientation="vertical" variant="outlined">
              <FieldLabel htmlFor="permission-order">Orden*</FieldLabel>
              <Input
                id="permission-order"
                placeholder="Agregar"
                type="number"
                min={1}
                value={permissionDraft.order}
                onChange={(event) =>
                  setPermissionDraft((prev) => ({ ...prev, order: event.target.value }))
                }
              />
            </Field>

            <Field orientation="vertical" variant="outlined">
              <FieldLabel htmlFor="permission-role">Rol*</FieldLabel>
              <Select
                id="permission-role"
                value={permissionDraft.roleCode}
                onValueChange={(value) =>
                  setPermissionDraft((prev) => ({ ...prev, roleCode: value ?? "" }))
                }
                items={roleItems}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {roleItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical" variant="outlined">
              <FieldLabel htmlFor="permission-campus">Sede educativa*</FieldLabel>
              <Select
                id="permission-campus"
                value={permissionDraft.campusId}
                onValueChange={(value) =>
                  setPermissionDraft((prev) => ({ ...prev, campusId: value ?? "" }))
                }
                items={campusItems}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {campusItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical" variant="outlined">
              <FieldLabel htmlFor="permission-schedule">Jornada*</FieldLabel>
              <Select
                id="permission-schedule"
                value={permissionDraft.workScheduleCode}
                onValueChange={(value) =>
                  setPermissionDraft((prev) => ({ ...prev, workScheduleCode: value ?? "" }))
                }
                items={workScheduleItems}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {workScheduleItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical" variant="outlined">
              <FieldLabel htmlFor="permission-status">Estado*</FieldLabel>
              <Select
                id="permission-status"
                value={permissionDraft.status}
                onValueChange={(value) =>
                  setPermissionDraft((prev) => ({
                    ...prev,
                    status: (value ?? "") as PermissionStatus | "",
                  }))
                }
                items={permissionStatusItems}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {permissionStatusItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="flex items-end md:justify-end">
              <Button
                variant="fill"
                color="primary"
                size="sm"
                onClick={addPermission}
                className="w-full md:w-auto"
              >
                <ControlPointIcon data-icon="inline-start" />
                Agregar
              </Button>
            </div>
          </div>

          {/* La tabla aparece recién con el primer permiso: vacía no aportaba
              nada más que un encabezado y una fila de "aún no hay". */}
          {permissions.length > 0 && (
            <Table containerClassName="max-h-[36vh] overflow-y-auto">
              <TableHeader>
                {/* El encabezado no lleva fondo propio ni hover: comparte el de
                    la tabla en reposo, igual que una fila sin el puntero
                    encima. `has-aria-expanded` cubre el rato en que un menú de
                    orden está abierto. */}
                <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
                  <TableHead className="text-foreground">
                    <TableSortableHeader
                      title="Orden"
                      sortKey="order"
                      sort={permissionSort}
                      onSortChange={setPermissionSort}
                    />
                  </TableHead>
                  <TableHead className="text-foreground">
                    <TableSortableHeader
                      title="Rol"
                      sortKey="role"
                      sort={permissionSort}
                      onSortChange={setPermissionSort}
                    />
                  </TableHead>
                  <TableHead className="text-foreground">
                    <TableSortableHeader
                      title="Sede educativa"
                      sortKey="campus"
                      sort={permissionSort}
                      onSortChange={setPermissionSort}
                    />
                  </TableHead>
                  <TableHead className="text-foreground">
                    <TableSortableHeader
                      title="Jornada"
                      sortKey="workSchedule"
                      sort={permissionSort}
                      onSortChange={setPermissionSort}
                    />
                  </TableHead>
                  <TableHead className="text-foreground">
                    <TableSortableHeader
                      title="Estado"
                      sortKey="status"
                      sort={permissionSort}
                      onSortChange={setPermissionSort}
                    />
                  </TableHead>
                  {/* La columna de acciones no rotula —el `th` solo reserva el
                      ancho del bloque— y el título queda para lectores. */}
                  {PERMISSION_ACTIONS_SPACER_HEAD}
                  <TableHead className="w-px text-foreground">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPermissions.map((permission) => (
                  <TableRow key={`${permission.order}-${permission.campus.id}`} className="group/row">
                    <TableCell className="font-medium">{permission.order}</TableCell>
                    <TableCell>{permission.role.name}</TableCell>
                    <TableCell>{permission.campus.name}</TableCell>
                    <TableCell className="uppercase">{permission.workSchedule.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="soft"
                        color={permission.status === "ACTIVE" ? "success" : "destructive"}
                      >
                        {permission.status === "ACTIVE" ? "Activo" : "Suspendido"}
                      </Badge>
                    </TableCell>
                    {PERMISSION_ACTIONS_SPACER_CELL}
                    <TableCell className={PERMISSION_ACTIONS_CELL_CLASS}>
                      <div className={permissionActionsOverlayClass()}>
                        <Button
                          type="button"
                          variant="ghost"
                          color="neutral"
                          size="icon-sm"
                          aria-label={`Quitar permiso ${permission.order}`}
                          onClick={() => removePermission(permission.order)}
                        >
                          <TrashIcon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <DialogFooter className="justify-end sm:justify-end">
            {/* "Guardar" solo cuando hay algo que guardar: sin permisos en la
                tabla no confirma nada y competía con "Agregar", que es la
                acción real de esta pantalla. */}
            {permissions.length > 0 && (
              <Button variant="fill" color="primary" size="sm" onClick={closePermissionsDialog}>
                <CheckIcon data-icon="inline-start" />
                Guardar
              </Button>
            )}
            <Button
              variant="fill"
              color="neutral"
              size="sm"
              onClick={() => setPermissionsDialogOpen(false)}
            >
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={additionalInfoDialogOpen} onOpenChange={setAdditionalInfoDialogOpen}>
        <DialogContent
          // Mismo ancho que el diálogo principal y el de permisos: era el único
          // más ancho y se notaba al saltar de uno a otro.
          className="w-[min(98vw,70rem)] max-w-none sm:max-w-280 max-h-[92vh] overflow-y-auto overflow-x-hidden"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>Información complementaria</DialogTitle>
          </DialogHeader>

          <NoticeOutlet className="mb-2" />

          <EmployeeAdditionalInfoForm
            value={additionalInfo}
            onChange={setAdditionalInfo}
          />

          <DialogFooter className="justify-end sm:justify-end">
            <Button variant="fill" color="primary" size="sm" onClick={closeAdditionalInfoDialog}>
              <CheckIcon data-icon="inline-start" />
              Guardar
            </Button>
            <Button
              variant="fill"
              color="neutral"
              size="sm"
              onClick={() => setAdditionalInfoDialogOpen(false)}
            >
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
