import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { menusQueryKey } from "@/features/administration/roles-menus/api/query/use-menus-query"
import type { UpdateRoleMenusResult } from "@/features/administration/roles-menus/api/types/role-menu"

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
      queryClient.invalidateQueries({ queryKey: menusQueryKey() })
      queryClient.invalidateQueries({ queryKey: ["role-menus"] })
      queryClient.invalidateQueries({ queryKey: ["navigation", "menu"] })
      onSuccess?.(...args)
    },
  })
}
