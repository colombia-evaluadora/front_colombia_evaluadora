import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { toSelectOptions } from "@/lib/catalog-options"

import { useFuncionarioFichaQuery } from "@/features/establishment/employees/api/query/use-funcionario-ficha"
import { useEmployeeRolesQuery } from "@/features/establishment/employees/api/query/use-employee-roles"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"
import { toCrearItem, updateEmployeePermissions } from "@/features/establishment/employees/api/mutations/update-permissions"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { useCampusesOptionsQuery } from "@/features/establishment/campuses/api/query/use-campuses-options"
import { PermissionsDialog } from "@/features/establishment/employees/components/dialogs/roles-permisos/permissions-dialog"
import {
  createPermissionDraft,
  permissionDraftSchema,
  type PermissionDraft,
} from "@/features/establishment/employees/components/dialogs/roles-permisos/schema"
import { DIRECTOR_GRUPO_ROLE_CODE } from "@/features/establishment/employees/components/dialogs/roles-permisos/helpers"
import type { Permission } from "@/features/establishment/institution/api/types/permission"

interface RolesPermisosDialogProps {
  /** El funcionario abierto; `null` cierra el diálogo. */
  employee: { id: number; name: string } | null
  establishmentId: number
  onOpenChange: (open: boolean) => void
}

/**
 * Roles y permisos del funcionario en el establecimiento, con el diálogo que ya existía: la vista
 * de la Sección 4.2 (Vigente hasta, Inactivar, Prorrogar, Permisos) viene en la parte siguiente.
 */
export function RolesPermisosDialog(props: RolesPermisosDialogProps) {
  return (
    <NoticeProvider>
      <RolesPermisosContent {...props} />
    </NoticeProvider>
  )
}

function RolesPermisosContent({ employee, establishmentId, onOpenChange }: RolesPermisosDialogProps) {
  const { notify } = useNotify()
  const queryClient = useQueryClient()
  const ficha = useFuncionarioFichaQuery(employee?.id ?? null, employee ? establishmentId : null)
  const { data: roles = [] } = useEmployeeRolesQuery()
  const { data: campuses = [], isPending: isLoadingCampuses } = useCampusesOptionsQuery()

  const [permissions, setPermissions] = useState<Permission[]>([])
  const [draft, setDraft] = useState<PermissionDraft>(createPermissionDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const original = ficha.data?.permissions
  useEffect(() => {
    if (!original) return
    setPermissions(original)
    setDraft(createPermissionDraft(original.length + 1))
    setErrors({})
  }, [original])

  // El responsable de grupo se asigna en el grupo (Regla 18); una sede inactiva no recibe roles (Regla 100).
  const roleItems = toSelectOptions(roles.filter((role) => role.code !== DIRECTOR_GRUPO_ROLE_CODE))
  const sedesDelEE = campuses.filter(
    (campus) => campus.status !== "I" && (campus.establishmentId == null || campus.establishmentId === establishmentId),
  )
  const campusItems = toSelectOptions(sedesDelEE)
  const workSchedules = (sedesDelEE.find((campus) => campus.id === draft.campusId)?.workSchedules ?? []).map((j) => ({
    id: j.id,
    code: String(j.id),
    name: j.name,
  }))

  function addPermission() {
    const parsed = permissionDraftSchema.safeParse(draft)
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) next[issue.path.join(".")] ??= issue.message
      setErrors(next)
      return
    }
    setErrors({})
    const role = roles.find((item) => item.id === parsed.data.roleId)
    const campus = sedesDelEE.find((item) => item.id === parsed.data.campusId)
    const workSchedule = workSchedules.find((item) => item.id === parsed.data.workScheduleId)
    if (!role || !campus || !workSchedule) return
    if (permissions.some((p) => p.role.id === role.id && p.campus.id === campus.id && p.workSchedule.id === workSchedule.id)) {
      notify(`El funcionario ya tiene el rol ${role.name} en ${campus.name} · ${workSchedule.name}.`, { variant: "error" })
      return
    }
    setPermissions((current) => [
      ...current,
      { order: Number(parsed.data.order), role, campus, workSchedule, status: parsed.data.status },
    ])
    setDraft(createPermissionDraft(permissions.length + 2))
  }

  async function save() {
    if (!employee) return
    const actuales = new Set(permissions.map((p) => p.id).filter((id): id is number => id !== undefined))
    const items = [
      ...(original ?? [])
        .filter((p) => p.id !== undefined && !actuales.has(p.id))
        .map((p) => ({ accion: "eliminar" as const, id: p.id as number })),
      ...permissions.filter((p) => p.id === undefined).map(toCrearItem),
    ]
    if (items.length === 0) {
      onOpenChange(false)
      return
    }
    setSaving(true)
    try {
      const results = await updateEmployeePermissions(employee.id, items)
      const fallos = results.filter((row) => row.status?.startsWith("error:")).map((row) => row.status.slice(6).replaceAll("_", " "))
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all })
      void queryClient.invalidateQueries({ queryKey: academicPeriodKeys.assignmentTeachers.all })
      if (fallos.length > 0) {
        notify(`No se pudieron guardar ${fallos.length} rol(es): ${fallos.join(", ")}.`, { variant: "error" })
        return
      }
      onOpenChange(false)
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <PermissionsDialog
      open={employee != null}
      onOpenChange={(open) => {
        if (!open && saving) return
        onOpenChange(open)
      }}
      permissionDraft={draft}
      onDraftChange={setDraft}
      permissionErrors={errors}
      roleItems={roleItems}
      campusItems={campusItems}
      workScheduleItems={toSelectOptions(workSchedules)}
      isLoadingSedeJornadas={isLoadingCampuses || ficha.isPending}
      workScheduleEmptyMessage={
        draft.campusId == null ? "Elige primero la sede educativa." : "Esta sede no tiene jornadas. Agrégalas en Sedes educativas."
      }
      workScheduleEmptyShortMessage="Sin jornadas"
      permissions={permissions}
      onAdd={addPermission}
      onRemove={(removed) => setPermissions((current) => current.filter((p) => p !== removed))}
      hasChanges={JSON.stringify(permissions) !== JSON.stringify(original ?? [])}
      onSave={save}
      isSaving={saving}
    />
  )
}
