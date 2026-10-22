import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"

import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { update } from "@/features/establishment/employees/api/mutations/update"
import {
  toCrearItem,
  updateEmployeePermissions,
  type PermissionSyncItem,
} from "@/features/establishment/employees/api/mutations/update-permissions"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"
import type { Employee } from "@/features/establishment/employees/api/types/employee"
import type { Permission } from "@/features/establishment/institution/api/types/permission"

/**
 * Guardado ÚNICO del diálogo de funcionario (botón "Guardar").
 *
 * Antes cada sub-diálogo persistía por su cuenta: cerrar "Información
 * complementaria" mandaba un PATCH y "Guardar" otro, así que una sola edición
 * dejaba dos escrituras (dos MODIFIED_AT) y dos notificaciones APP_ACCION
 * "Actualización del funcionario …". Ahora los sub-diálogos solo tocan el
 * borrador local y todo viaja acá, en este orden:
 *
 *   1. PATCH /establecimientos/funcionarios/:id (`fn_fun_actualizar`) — solo si
 *      cambió la ficha (persona, información complementaria o foto).
 *   2. PUT /funcionario/:id/permisos (`fn_fun_permisos_actualizar`) — solo si
 *      hay altas o bajas de permisos.
 *
 * La ficha va primero a propósito: los dos gates (`fn_assert_permiso_funcionario`)
 * exigen que el objetivo esté al alcance del solicitante, y ese alcance sale de
 * los TSEDE_USUARIO del objetivo. Si el PUT le quitara antes los permisos en
 * las sedes del solicitante, el PATCH posterior quedaría rechazado (42501).
 * Si el PATCH falla no se toca ningún permiso.
 *
 * En mock no hay endpoint de permisos: viajan embebidos en el payload general
 * (`update` hace PUT al handler MSW), así que hay un único request si cambió
 * cualquiera de las dos cosas.
 */
export interface SaveEmployeeChangesInput {
  employeeId: number
  /** Payload completo: persona + información complementaria + permisos del borrador. */
  values: Employee
  /** ¿Cambió la ficha (persona, información complementaria o foto)? Decide el PATCH. */
  employeeDataChanged: boolean
  /** PK_TSEDE_USUARIO que ya existían al cargar (o tras el último guardado). */
  originalPermissionIds: ReadonlySet<number>
  /** Solo mock: ¿cambiaron los permisos? (en mock no traen `id` para hacer el diff). */
  permissionsChanged: boolean
  foto?: File | null
  removePhoto?: boolean
}

export interface PermissionSyncOutcome {
  /** Borrador actualizado: las altas exitosas quedan con su `id`, las fallidas sin él (se reintentan). */
  permissions: Permission[]
  /** Nuevo conjunto de PK persistidos, para el diff del próximo guardado. */
  originalPermissionIds: Set<number>
  /** Motivo legible de cada fila rechazada (`status` "error:..."). */
  failures: string[]
}

export type SaveEmployeeChangesResult =
  /** El PATCH devolvió `status: "error"`: no se guardó nada. */
  | { status: "error"; message: string }
  | {
      status: "ok"
      /** Se mandó el PATCH (la ficha cambió). */
      patched: boolean
      /** Resultado del PUT de permisos; `null` si no hacía falta. */
      permissions: PermissionSyncOutcome | null
      /** El PUT de permisos tiró (la ficha ya quedó guardada). */
      permissionsError: unknown
    }

/** Altas (sin `id`) y bajas (ids originales que ya no están en el borrador). */
export function diffPermissions(originalIds: ReadonlySet<number>, permissions: Permission[]) {
  const currentIds = new Set(
    permissions.map((permission) => permission.id).filter((id): id is number => id !== undefined),
  )
  return {
    currentIds,
    toDelete: [...originalIds].filter((id) => !currentIds.has(id)),
    toCreate: permissions.filter((permission) => permission.id === undefined),
  }
}

async function syncPermissions(
  employeeId: number,
  originalIds: ReadonlySet<number>,
  permissions: Permission[],
): Promise<PermissionSyncOutcome | null> {
  const { currentIds, toDelete, toCreate } = diffPermissions(originalIds, permissions)
  if (toDelete.length === 0 && toCreate.length === 0) return null

  const items: PermissionSyncItem[] = [
    ...toDelete.map((id): PermissionSyncItem => ({ accion: "eliminar", id })),
    ...toCreate.map(toCrearItem),
  ]
  const results = await updateEmployeePermissions(employeeId, items)

  // Una fila por ítem, en el mismo orden: `status` "error:..." si esa fila falló.
  const fallo = (index: number) => results[index]?.status?.startsWith("error:") ?? true
  const failures = results
    .filter((row) => row.status?.startsWith("error:"))
    .map((row) => row.status.slice(6).replaceAll("_", " "))
  const deletesFallidos = toDelete.filter((_, i) => fallo(i))
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

  return {
    permissions: nextPermissions,
    originalPermissionIds: new Set([...currentIds, ...createdIds, ...deletesFallidos]),
    failures,
  }
}

export async function saveEmployeeChanges(input: SaveEmployeeChangesInput): Promise<SaveEmployeeChangesResult> {
  const { employeeId, values, employeeDataChanged, foto, removePhoto } = input

  if (env.ENABLE_API_MOCKING) {
    if (!employeeDataChanged && !input.permissionsChanged) {
      return { status: "ok", patched: false, permissions: null, permissionsError: null }
    }
    const result = await update(employeeId, values, foto, removePhoto)
    if (result.status === "error") return { status: "error", message: result.message }
    return { status: "ok", patched: true, permissions: null, permissionsError: null }
  }

  if (employeeDataChanged) {
    const result = await update(employeeId, values, foto, removePhoto)
    if (result?.status === "error") return { status: "error", message: result.message }
  }

  try {
    const permissions = await syncPermissions(employeeId, input.originalPermissionIds, values.permissions)
    return { status: "ok", patched: employeeDataChanged, permissions, permissionsError: null }
  } catch (error) {
    return { status: "ok", patched: employeeDataChanged, permissions: null, permissionsError: error }
  }
}

export function useSaveEmployeeChanges({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof saveEmployeeChanges> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: saveEmployeeChanges,
    ...rest,
    onSuccess: (...args) => {
      const [result] = args
      if (result.status === "ok" && (result.patched || result.permissions || result.permissionsError)) {
        void queryClient.invalidateQueries({ queryKey: employeeKeys.all })
        // Los permisos alimentan el select de docentes de las asignaciones académicas.
        if (result.permissions || result.permissionsError) {
          void queryClient.invalidateQueries({ queryKey: academicPeriodKeys.assignmentTeachers.all })
        }
      }
      onSuccess?.(...args)
    },
  })
}
