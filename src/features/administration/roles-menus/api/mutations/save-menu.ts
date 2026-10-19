import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import type { MenuNode } from "@/features/administration/roles-menus/api/types/role-menu"
import { roleMenuKeys } from "@/features/administration/roles-menus/api/query-keys"
import { navigationKeys } from "@/features/navigation/api/query-keys"

export interface MenuFormValues {
  name: string
  path: string
  icon: string
  /** `null` = menú principal (grupo raíz). */
  idParent: number | null
  visible?: boolean
  planId?: number | null
}

interface SaveMenuInput extends MenuFormValues {
  /** Sin id se crea; con id se edita. */
  id?: number
}

function saveMenu({ id, ...values }: SaveMenuInput): Promise<MenuNode> {
  return id == null
    ? evalCol.postRow<MenuNode>("/menus", values)
    : evalCol.patchRow<MenuNode>(`/menus/${id}`, values)
}

interface UseSaveMenuOptions {
  mutationConfig?: MutationConfig<typeof saveMenu>
}

export function useSaveMenu({ mutationConfig }: UseSaveMenuOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveMenu,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: roleMenuKeys.menus.all })
      queryClient.invalidateQueries({ queryKey: navigationKeys.menu })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
