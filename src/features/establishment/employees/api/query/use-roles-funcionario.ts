import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"

import type {
  EstadoRolAsignado,
  PermisoVista,
  RolAsignado,
  SedeAsignable,
} from "@/features/establishment/employees/api/types/rol-asignado"

/** Fila de `fn_fun_roles` (V579.12). */
interface RolAsignadoRow {
  id: number
  rol_id: number
  rol_codigo: string
  rol_nombre: string
  sede_id: number
  sede_nombre: string
  jornada_id: number
  jornada_nombre: string
  vigente_hasta: string | null
  estado: EstadoRolAsignado
  vencido: boolean
  dias_para_vencer: number | null
  principal_de: string | null
  puede_gestionar: boolean
  puede_permisos: boolean
}

const toRolAsignado = (row: RolAsignadoRow): RolAsignado => ({
  id: Number(row.id),
  roleId: Number(row.rol_id),
  roleCode: row.rol_codigo,
  roleName: row.rol_nombre,
  campusId: Number(row.sede_id),
  campusName: row.sede_nombre,
  workScheduleId: Number(row.jornada_id),
  workScheduleName: row.jornada_nombre,
  validUntil: row.vigente_hasta?.slice(0, 10) ?? null,
  status: row.estado,
  expired: row.vencido === true,
  daysToExpire: row.dias_para_vencer == null ? null : Number(row.dias_para_vencer),
  principalDe: row.principal_de ?? null,
  canManage: row.puede_gestionar === true,
  canRestrict: row.puede_permisos === true,
})

export function useRolesFuncionarioQuery(funcionarioId: number | null, establishmentId: number | null) {
  return useQuery({
    queryKey: employeeKeys.roles(funcionarioId, establishmentId),
    queryFn: async () => {
      const rows = await evalCol.getRows<RolAsignadoRow>(
        `/establecimientos/funcionarios/${funcionarioId}/roles?establecimiento=${establishmentId}`,
      )
      return rows.map(toRolAsignado)
    },
    enabled: funcionarioId != null && establishmentId != null,
  })
}

interface SedeAsignableRow {
  sede_id: number
  sede_nombre: string
  jornada_id: number
  jornada_nombre: string
}

/** Sedes activas y jornadas donde el usuario puede asignar (Reglas 26, 84 y 100). */
export function useSedesAsignablesQuery(establishmentId: number | null, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.sedesAsignables(establishmentId),
    queryFn: async (): Promise<SedeAsignable[]> => {
      const rows = await evalCol.getRows<SedeAsignableRow>(
        `/establecimientos/funcionarios/roles/sedes-asignables?establecimiento=${establishmentId}`,
      )
      return rows.map((row) => ({
        campusId: Number(row.sede_id),
        campusName: row.sede_nombre,
        workScheduleId: Number(row.jornada_id),
        workScheduleName: row.jornada_nombre,
      }))
    },
    enabled: enabled && establishmentId != null,
  })
}

/** Fila de `fn_fun_rol_permisos` (V579.12). */
interface PermisoVistaRow {
  pk_tmenu: number
  pk_padre: number | null
  nombre: string
  icono: string | null
  base_ver: boolean
  base_guardar: boolean
  base_eliminar: boolean
  acceso: boolean
  guardar: boolean
  eliminar: boolean
}

export const toPermisoVista = (row: PermisoVistaRow): PermisoVista => ({
  menuId: Number(row.pk_tmenu),
  parentId: row.pk_padre == null ? null : Number(row.pk_padre),
  name: row.nombre,
  icon: row.icono,
  baseAccess: row.base_ver === true,
  baseSave: row.base_guardar === true,
  baseDelete: row.base_eliminar === true,
  access: row.acceso === true,
  save: row.guardar === true,
  delete: row.eliminar === true,
})

/** Árbol de vistas del rol asignado, módulos antes que sus submódulos. */
export function usePermisosRolQuery(funcionarioId: number | null, asignacionId: number | null) {
  return useQuery({
    queryKey: employeeKeys.permisosRol(funcionarioId, asignacionId),
    queryFn: async () => {
      const rows = await evalCol.getRows<PermisoVistaRow>(`/establecimientos/funcionarios/roles/${asignacionId}/permisos`)
      return rows.map(toPermisoVista)
    },
    enabled: asignacionId != null,
  })
}
