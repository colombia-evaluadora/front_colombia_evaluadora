import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import type { MenuOrderItem } from "@/features/administration/roles-menus/api/types/role-menu"
import { roleMenuKeys } from "@/features/administration/roles-menus/api/query-keys"
import { navigationKeys } from "@/features/navigation/api/query-keys"

/**
 * Guarda el `menuOrder` de los menús que cambiaron de lugar. Va en una sola
 * llamada —y no un PATCH por menú— porque mover uno corre a todos sus
 * hermanos: si se mandaran de a uno, el menú quedaría con un orden a medio
 * aplicar ante cualquier error en el medio.
 */
function reorderMenus(items: MenuOrderItem[]): Promise<void> {
  return evalCol.put("/menus/order", { items })
}

interface UseReorderMenusOptions {
  mutationConfig?: MutationConfig<typeof reorderMenus>
}

export function useReorderMenus({ mutationConfig }: UseReorderMenusOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reorderMenus,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: roleMenuKeys.menus.all })
      // El orden es el mismo que pinta el menú lateral.
      queryClient.invalidateQueries({ queryKey: navigationKeys.menu })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
