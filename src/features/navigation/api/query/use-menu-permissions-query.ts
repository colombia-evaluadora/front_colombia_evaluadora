import { queryOptions, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MenuPermission } from "@/features/navigation/api/types/menu-permission"
import { navigationKeys } from "@/features/navigation/api/query-keys"

async function fetchMenuPermissions(): Promise<MenuPermission[]> {
  return evalCol.getRows<MenuPermission>("/usuarios/permisos-menu")
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
