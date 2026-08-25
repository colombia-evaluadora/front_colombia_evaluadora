import { useMenuPermissionsQuery } from "@/features/navigation/api/query/use-menu-permissions-query"

export interface MenuActionPermissions {
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
  puedeVer: boolean
  isLoading: boolean
}

// Sin fila para el código: mientras carga no se puede afirmar nada, así que
// todo queda deshabilitado hasta tener la respuesta. Si ya cargó y el menú no
// aparece, es que el usuario no tiene ningún permiso ahí.
const DENIED = {
  puedeCrear: false,
  puedeEditar: false,
  puedeEliminar: false,
  puedeVer: false,
} as const

/**
 * Permisos CRUD del usuario para un menú puntual, ej. `useMenuPermission("FUNCIONARIOS")`.
 * `codigo` es el código del menú tal como lo devuelve `permisos-menu` (y como
 * se define en la pantalla de configuración de roles y menús).
 */
export function useMenuPermission(codigo: string): MenuActionPermissions {
  const { data, isLoading } = useMenuPermissionsQuery()

  const permission = data?.find((row) => row.codigo === codigo)
  if (!permission) {
    return { ...DENIED, isLoading }
  }

  return {
    puedeCrear: permission.puede_crear,
    puedeEditar: permission.puede_editar,
    puedeEliminar: permission.puede_eliminar,
    puedeVer: permission.puede_ver,
    isLoading,
  }
}
