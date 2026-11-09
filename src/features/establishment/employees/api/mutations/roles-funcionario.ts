import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

// Roles y permisos del funcionario (Sección 4.2, V579.13). Cada escritura cambia los roles del
// listado y quién puede ser docente en las asignaciones académicas.
function invalidarRoles(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: employeeKeys.all })
  void queryClient.invalidateQueries({ queryKey: academicPeriodKeys.assignmentTeachers.all })
}

function useRolMutation<V>(mutationFn: (variables: V) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => invalidarRoles(queryClient) })
}

export interface AsignarRolInput {
  funcionarioId: number
  roleId: number
  campusId: number
  workScheduleId: number
  /** `yyyy-MM-dd`; vacía = no vence. */
  validUntil: string
}

export function useAsignarRol() {
  return useRolMutation(({ funcionarioId, roleId, campusId, workScheduleId, validUntil }: AsignarRolInput) =>
    evalCol.postRow(`/establecimientos/funcionarios/${funcionarioId}/roles`, {
      ROL: roleId,
      SEDE: campusId,
      JORNADA: workScheduleId,
      VIGENTE_HASTA: validUntil,
    }),
  )
}

export function useInactivarRol() {
  return useRolMutation(({ asignacionId }: { asignacionId: number }) =>
    evalCol.put(`/establecimientos/funcionarios/roles/${asignacionId}/inactivar`),
  )
}

export interface ActivarRolInput {
  asignacionId: number
  /** Solo para un rol vencido: se cambia la Vigente hasta por `validUntil` (vacía = no vence). */
  changeValidity: boolean
  validUntil: string
}

export function useActivarRol() {
  return useRolMutation(({ asignacionId, changeValidity, validUntil }: ActivarRolInput) =>
    evalCol.put(`/establecimientos/funcionarios/roles/${asignacionId}/activar`, {
      CAMBIAR_VIGENCIA: changeValidity,
      VIGENTE_HASTA: validUntil,
    }),
  )
}

export function useProrrogarRol() {
  return useRolMutation(({ asignacionId, validUntil }: { asignacionId: number; validUntil: string }) =>
    evalCol.put(`/establecimientos/funcionarios/roles/${asignacionId}/prorrogar`, { VIGENTE_HASTA: validUntil }),
  )
}

export function useEliminarRol() {
  return useRolMutation(({ asignacionId }: { asignacionId: number }) =>
    evalCol.put(`/establecimientos/funcionarios/roles/${asignacionId}/eliminar`),
  )
}

export interface PermisoRolInput {
  menu: number
  acceso: boolean
  guardar: boolean
  eliminar: boolean
}

/** Reemplaza las restricciones del rol asignado; el backend solo guarda lo que baja algo (Regla 25). */
export function useGuardarPermisosRol() {
  return useRolMutation(({ asignacionId, permisos }: { asignacionId: number; permisos: PermisoRolInput[] }) =>
    // JSONB viaja como texto JSON, igual que en el planeador.
    evalCol.put(`/establecimientos/funcionarios/roles/${asignacionId}/permisos`, { PERMISOS: JSON.stringify(permisos) }),
  )
}
