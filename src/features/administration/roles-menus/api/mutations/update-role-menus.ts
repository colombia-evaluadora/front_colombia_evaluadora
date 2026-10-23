import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import type { UpdateRoleMenusResult } from "@/features/administration/roles-menus/api/types/role-menu"
import { roleMenuKeys } from "@/features/administration/roles-menus/api/query-keys"
import { navigationKeys } from "@/features/navigation/api/query-keys"

interface UpdateRoleMenusInput {
  roleId: number
  menus: { id: number; soloLectura: boolean; guardar?: boolean; eliminar?: boolean }[]
}

function updateRoleMenus({
  roleId,
  menus,
}: UpdateRoleMenusInput): Promise<UpdateRoleMenusResult> {
  return evalCol.putRow<UpdateRoleMenusResult>(`/roles/${roleId}/menus`, { menus })
}

interface UseUpdateRoleMenusOptions {
  mutationConfig?: MutationConfig<typeof updateRoleMenus>
}

export function useUpdateRoleMenus({ mutationConfig }: UseUpdateRoleMenusOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateRoleMenus,
    ...mutationConfig,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: roleMenuKeys.roleMenus.detalle(variables.roleId) })
      // El menú lateral del usuario sale del mismo catálogo: si cambian los
      // permisos de su rol, hay que volver a pedirlo.
      queryClient.invalidateQueries({ queryKey: navigationKeys.menu })
      mutationConfig?.onSuccess?.(data, variables, ...rest)
    },
  })
}
