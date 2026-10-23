import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import type { UpdateRoleMenusResult } from "@/features/administration/roles-menus/api/types/role-menu"
import { roleMenuKeys } from "@/features/administration/roles-menus/api/query-keys"
import { navigationKeys } from "@/features/navigation/api/query-keys"

function setMenuState({ id, activo }: { id: number; activo: boolean }): Promise<UpdateRoleMenusResult> {
  return evalCol.putRow<UpdateRoleMenusResult>(`/menus/${id}/estado`, { activo })
}

interface UseSetMenuStateOptions {
  mutationConfig?: MutationConfig<typeof setMenuState>
}

export function useSetMenuState({ mutationConfig }: UseSetMenuStateOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: setMenuState,
    ...rest,
    onSuccess: (...args) => {
      // Un menú inactivo sale de las vistas base de los roles y del menú lateral.
      queryClient.invalidateQueries({ queryKey: roleMenuKeys.menus.all })
      queryClient.invalidateQueries({ queryKey: roleMenuKeys.roleMenus.all })
      queryClient.invalidateQueries({ queryKey: navigationKeys.menu })
      onSuccess?.(...args)
    },
  })
}
