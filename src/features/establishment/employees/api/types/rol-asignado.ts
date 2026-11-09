/** `TSEDE_USUARIO.TLV_ESTADO`: un rol vencido queda `INACTIVO` (Regla 94). */
export type EstadoRolAsignado = "ACTIVO" | "INACTIVO"

/** Un rol del funcionario en una Sede y Jornada (Sección 4.2, `fn_fun_roles` de V579.12). */
export interface RolAsignado {
  /** `PK_TSEDE_USUARIO`. */
  id: number
  roleId: number
  roleCode: string
  roleName: string
  campusId: number
  campusName: string
  workScheduleId: number
  workScheduleName: string
  /** `yyyy-MM-dd`; `null` = no vence. */
  validUntil: string | null
  status: EstadoRolAsignado
  /** Inactivo porque pasó su Vigente hasta: al activarlo se pide una fecha nueva. */
  expired: boolean
  /** Días que le quedan si está activo y vence; `null` si no. */
  daysToExpire: number | null
  /** Rol del Rector o Secretario(a) del panel del Establecimiento (Regla 83): no se gestiona aquí. */
  principalDe: string | null
  /** Inactivar, Activar, Prorrogar y Eliminar (Regla 26). */
  canManage: boolean
  /** Restringir sus permisos: solo el Rector o el Jefe de Sistemas (Regla 25). */
  canRestrict: boolean
}

/** Par Sede · Jornada donde el usuario puede asignar roles (`fn_fun_sedes_asignables`). */
export interface SedeAsignable {
  campusId: number
  campusName: string
  workScheduleId: number
  workScheduleName: string
}

/**
 * Una vista del rol asignado (`fn_fun_rol_permisos`): lo que da el rol (`base*`) y lo que queda
 * después de sus restricciones. Un módulo (`parentId` nulo) agrupa a sus submódulos.
 */
export interface PermisoVista {
  menuId: number
  parentId: number | null
  name: string
  icon: string | null
  baseAccess: boolean
  baseSave: boolean
  baseDelete: boolean
  access: boolean
  save: boolean
  delete: boolean
}
