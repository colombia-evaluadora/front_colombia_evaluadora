import type { Permission } from "@/features/establishment/institution/api/types/permission"

/** TROL.CODIGO del director de grupo: ese permiso lo gestiona el grupo, no este diálogo. */
export const DIRECTOR_GRUPO_ROLE_CODE = "DIRECTOR_GRUPO"

/** Columnas por las que se puede ordenar la tabla de permisos. */
export type PermissionSortKey = "order" | "role" | "campus" | "workSchedule" | "status"

/** El valor plano por el que ordena cada columna (los catálogos son objetos). */
export function permissionSortValue(permission: Permission, key: PermissionSortKey): unknown {
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
