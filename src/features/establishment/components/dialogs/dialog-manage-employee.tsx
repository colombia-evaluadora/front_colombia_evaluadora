import { useEffect, useState } from "react"
import { toast } from "sonner"

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
import { PlusIcon, TrashIcon } from "@/components/ui/icons"
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
import { CATALOGS } from "@/lib/catalogs"

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

interface ManageEmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId?: string | null
}

interface PermissionDraft {
  roleCode: string
  campusId: string
  workScheduleCode: string
  status: PermissionStatus | ""
}

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

function createPermissionDraft(): PermissionDraft {
  return {
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

export function ManageEmployeeDialog({ open, onOpenChange, employeeId }: ManageEmployeeDialogProps) {
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
  // Estado UI: vive fuera de `Person` porque no es parte del modelo de negocio.
  const [confirmPassword, setConfirmPassword] = useState("")

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
      return
    }

    if (employeeQuery.data?.status === "ok") {
      const employee = employeeQuery.data.employee
      setPerson(employee.person)
      setPermissions(employee.permissions)
      setAdditionalInfo(createAdditionalInfoFromEmployee(employee))
      setPermissionDraft(createPermissionDraft())
      setConfirmPassword(employee.person.password)
    }
  }, [employeeQuery.data, isEditMode, open])

  const createPersonMutation = useCreateEmployeePerson({
    mutationConfig: {
      onError: (error) => {
        toast.error(error.message || "No fue posible guardar el usuario.")
      },
    },
  })

  const createEmployeeMutation = useCreateEmployee({
    mutationConfig: {
      onError: (error) => {
        toast.error(error.message || "No fue posible crear el funcionario.")
      },
    },
  })

  const updateEmployeeMutation = useUpdateEmployee({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }

        toast.success(result.message)
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error(error.message || "No fue posible actualizar el funcionario.")
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
      toast.error("No hay datos del usuario para guardar.")
      return
    }

    // 1) Garantizar que la persona exista en personsDb (POST /person)
    let persistedPerson = draft

    if (!persistedPerson.id) {
      if (!isPersonMinComplete(persistedPerson)) {
        toast.error(
          "Completa los datos mínimos del usuario (tipo de documento, número, primer nombre y primer apellido)."
        )
        return
      }

      const result = await createPersonMutation.mutateAsync(persistedPerson)

      if (result.status === "error") {
        toast.error(result.message)
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
        toast.error(result.message)
        return
      }

      // Fijamos el id del empleado recién creado para que las próximas
      // invocaciones a handleMainSave pasen por PUT, y habilitamos los
      // botones opcionales sin cerrar el diálogo.
      setCreatedEmployeeId(result.employee.id)
      toast.success(
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
    if (!permissionDraft.roleCode || !permissionDraft.campusId || !permissionDraft.workScheduleCode || !permissionDraft.status) {
      toast.error("Completa los campos obligatorios del permiso.")
      return
    }

    const role = roles.find((item) => item.code === permissionDraft.roleCode)
    const campus = findCampusById(permissionDraft.campusId)
    const workSchedule = workSchedules.find((item) => item.code === permissionDraft.workScheduleCode)

    if (!role || !campus || !workSchedule) {
      toast.error("No fue posible resolver los datos del permiso seleccionado.")
      return
    }

    const nextPermission: Permission = {
      order: permissions.length + 1,
      role,
      campus,
      workSchedule,
      status: permissionDraft.status,
    }

    setPermissions((current) => [...current, nextPermission])
    setPermissionDraft(createPermissionDraft())
  }

  function removePermission(order: number) {
    setPermissions((current) =>
      current
        .filter((permission) => permission.order !== order)
        .map((permission, index) => ({ ...permission, order: index + 1 }))
    )
  }

  function closePermissionsDialog() {
    setPermissionsDialogOpen(false)
    toast.info("Permisos agregados al borrador. Pulsa Guardar para persistir el funcionario.")
  }

  function closeAdditionalInfoDialog() {
    setAdditionalInfoDialogOpen(false)
    toast.info("Información complementaria agregada al borrador. Pulsa Guardar para persistir el funcionario.")
  }

  const mainTitle = isEditMode ? "Editar usuario" : "Agregar usuario"

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-[min(98vw,76rem)] max-w-none sm:max-w-304 max-h-[92vh] overflow-y-auto overflow-x-hidden"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>{mainTitle}</DialogTitle>
          </DialogHeader>

          <UserDetailsForm
            value={person}
            onChange={setPerson}
            confirmPassword={confirmPassword}
            onConfirmPasswordChange={setConfirmPassword}
          />

          <DialogFooter className="flex-row flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {canOpenOptionalSections && (
                <Button
                  variant="fill"
                  color="info"
                  size="sm"
                  onClick={() => setPermissionsDialogOpen(true)}
                >
                  <PlusIcon data-icon="inline-start" />
                  Permisos / {permissions.length}
                </Button>
              )}

              {canOpenOptionalSections && (
                <Button
                  variant="fill"
                  color="info"
                  size="sm"
                  onClick={() => setAdditionalInfoDialogOpen(true)}
                >
                  <PlusIcon data-icon="inline-start" />
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
                {isSavingMain
                  ? "Guardando..."
                  : isEditMode
                    ? "Guardar cambios"
                    : "Guardar"}
              </Button>
              <Button
                variant="fill"
                color="neutral"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSavingMain}
              >
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field orientation="vertical" variant="outlined">
              <FieldLabel htmlFor="permission-order">Orden*</FieldLabel>
              <Input id="permission-order" value={String(permissions.length + 1)} readOnly />
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
                  <SelectValue placeholder="Seleccionar rol" />
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
                  <SelectValue placeholder="Seleccionar sede educativa" />
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
                  <SelectValue placeholder="Seleccionar jornada" />
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
                  <SelectValue placeholder="Seleccionar estado" />
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
              <Button variant="fill" color="info" size="sm" onClick={addPermission} className="w-full md:w-auto">
                <PlusIcon data-icon="inline-start" />
                Agregar
              </Button>
            </div>
          </div>

          <div className="max-h-[36vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Sede educativa</TableHead>
                  <TableHead>Jornada</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-16 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Aún no hay permisos agregados.
                    </TableCell>
                  </TableRow>
                ) : (
                  permissions.map((permission) => (
                    <TableRow key={`${permission.order}-${permission.campus.id}`}>
                      <TableCell>{permission.order}</TableCell>
                      <TableCell>{permission.role.name}</TableCell>
                      <TableCell>{permission.campus.name}</TableCell>
                      <TableCell>{permission.workSchedule.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="fill"
                          color={permission.status === "ACTIVE" ? "success" : "destructive"}
                        >
                          {permission.status === "ACTIVE" ? "Activo" : "Suspendido"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="fill"
                          color="destructive"
                          size="icon"
                          className="size-8"
                          aria-label="Eliminar permiso"
                          onClick={() => removePermission(permission.order)}
                        >
                          <TrashIcon />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="justify-end sm:justify-end">
            <Button variant="fill" color="primary" size="sm" onClick={closePermissionsDialog}>
              Aceptar
            </Button>
            <Button
              variant="fill"
              color="neutral"
              size="sm"
              onClick={() => setPermissionsDialogOpen(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={additionalInfoDialogOpen} onOpenChange={setAdditionalInfoDialogOpen}>
        <DialogContent
          className="w-[min(98vw,74rem)] max-w-none sm:max-w-296 max-h-[92vh] overflow-y-auto overflow-x-hidden"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>Información complementaria</DialogTitle>
          </DialogHeader>

          <EmployeeAdditionalInfoForm
            value={additionalInfo}
            onChange={setAdditionalInfo}
          />

          <DialogFooter className="justify-end sm:justify-end">
            <Button variant="fill" color="primary" size="sm" onClick={closeAdditionalInfoDialog}>
              Aceptar
            </Button>
            <Button
              variant="fill"
              color="neutral"
              size="sm"
              onClick={() => setAdditionalInfoDialogOpen(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
