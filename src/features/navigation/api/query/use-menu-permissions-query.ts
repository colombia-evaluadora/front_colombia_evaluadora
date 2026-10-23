import { queryOptions, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { isNetworkError } from "@/lib/network-error"
import { getUsableOfflineSession, MENU_SNAPSHOT_TTL_MS } from "@/lib/offline/session"
import type { MenuPermission } from "@/features/navigation/api/types/menu-permission"
import { navigationKeys } from "@/features/navigation/api/query-keys"

/**
 * Sin red, el snapshot de la sesión guardada. Normalmente ya lo sembró
 * `enterOfflineSession` y esta función ni corre, pero al recargar sin conexión
 * la pantalla puede montar (o el guard prefetchear) antes de esa siembra: la
 * query quedaba en error por red y el banner decía "Parte de esta pantalla no
 * está guardada en este equipo" con todo cargado (QA testv2, matrícula).
 */
async function permisosDeLaSesion(): Promise<MenuPermission[] | null> {
  const session = await getUsableOfflineSession()
  if (!session?.permisos || session.menuSavedAt == null) return null
  if (Date.now() - session.menuSavedAt > MENU_SNAPSHOT_TTL_MS) return null
  return session.permisos as MenuPermission[]
}

async function fetchMenuPermissions(): Promise<MenuPermission[]> {
  try {
    return await evalCol.getRows<MenuPermission>("/usuarios/permisos-menu")
  } catch (error) {
    if (!isNetworkError(error)) throw error
    const snapshot = await permisosDeLaSesion()
    if (snapshot) return snapshot
    throw error
  }
}

/**
 * Permisos CRUD del usuario por menú, una sola vez por sesión: igual que
 * `useNavItemsQuery`, el cache se vacía con `queryClient.clear()` en logout y
 * se descarta al iniciar sesión (`src/lib/auth.ts`). Sin red salen del
 * snapshot de la sesión guardada (`lib/offline/session.ts`), por eso el guard
 * de `/app` los pide apenas hay sesión (`router.tsx`).
 */
export const menuPermissionsQueryOptions = queryOptions({
  queryKey: navigationKeys.permisosMenu,
  queryFn: fetchMenuPermissions,
  staleTime: Infinity,
})

export function useMenuPermissionsQuery() {
  return useQuery(menuPermissionsQueryOptions)
}
