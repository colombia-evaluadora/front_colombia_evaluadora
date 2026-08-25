import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MenuPermission } from "@/features/navigation/api/types/menu-permission"

async function fetchMenuPermissions(): Promise<MenuPermission[]> {
  return evalCol.getRows<MenuPermission>("/usuarios/permisos-menu")
}

/**
 * Permisos CRUD del usuario por menú, una sola vez por sesión: igual que
 * `useNavItemsQuery`, el cache se invalida solo con `queryClient.clear()` en
 * logout (`src/lib/auth.ts`).
 */
export function useMenuPermissionsQuery() {
  return useQuery({
    queryKey: ["navigation", "permisos-menu"],
    queryFn: fetchMenuPermissions,
    staleTime: Infinity,
  })
}
