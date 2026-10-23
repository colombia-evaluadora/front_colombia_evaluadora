import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import type { UpdateRoleMenusResult } from "@/features/administration/roles-menus/api/types/role-menu"
import { roleMenuKeys } from "@/features/administration/roles-menus/api/query-keys"

/** Acciones que tiene la vista (TMENU.ADMITE_GUARDAR / ADMITE_ELIMINAR, V303). */
export interface MenuActions {
  guardar: boolean
  eliminar: boolean
}

function setMenuActions({ id, ...actions }: MenuActions & { id: number }): Promise<UpdateRoleMenusResult> {
  return evalCol.putRow<UpdateRoleMenusResult>(`/menus/${id}/acciones`, actions)
}

interface UseSetMenuActionsOptions {
  mutationConfig?: MutationConfig<typeof setMenuActions>
}

export function useSetMenuActions({ mutationConfig }: UseSetMenuActionsOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: setMenuActions,
    ...rest,
    onSuccess: (...args) => {
      // Una acción que la vista deja de tener sale de los permisos de los roles.
      queryClient.invalidateQueries({ queryKey: roleMenuKeys.menus.all })
      queryClient.invalidateQueries({ queryKey: roleMenuKeys.roleMenus.all })
      onSuccess?.(...args)
    },
  })
}
