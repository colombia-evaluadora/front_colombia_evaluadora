import { useConnectivity } from "@/lib/offline/use-connectivity"
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
export function useMenuPermission(
  codigo: string,
  { onlineOnlyWrites = false }: { onlineOnlyWrites?: boolean } = {},
): MenuActionPermissions {
  const { data, isLoading } = useMenuPermissionsQuery()
  const { status } = useConnectivity()
  // Pantallas de solo consulta sin red (EE, sedes): sus escrituras no pasan por
  // la outbox, así que sin conexión se ocultan crear/editar/eliminar en lugar
  // de fallar con un error de red (auditoría de rutas offline).
  const sinEscritura = onlineOnlyWrites && status === "offline"

  const permission = data?.find((row) => row.codigo === codigo)
  if (!permission) {
    return { ...DENIED, isLoading }
  }

  return {
    puedeCrear: permission.puede_crear && !sinEscritura,
    puedeEditar: permission.puede_editar && !sinEscritura,
    puedeEliminar: permission.puede_eliminar && !sinEscritura,
    puedeVer: permission.puede_ver,
    isLoading,
  }
}
