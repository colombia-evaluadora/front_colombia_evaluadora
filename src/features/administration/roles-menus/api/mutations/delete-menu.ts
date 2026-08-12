import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import { menusQueryKey } from "../query/use-menus-query"
import type { UpdateRoleMenusResult } from "../types/role-menu"

function deleteMenu({ id }: { id: number }): Promise<UpdateRoleMenusResult> {
  return api.delete(`/menus/${id}`)
}

interface UseDeleteMenuOptions {
  mutationConfig?: MutationConfig<typeof deleteMenu>
}

export function useDeleteMenu({ mutationConfig }: UseDeleteMenuOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteMenu,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: menusQueryKey() })
      // Borrar un menú también cambia lo que ve cada rol.
      queryClient.invalidateQueries({ queryKey: ["role-menus"] })
      queryClient.invalidateQueries({ queryKey: ["navigation", "menu"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
