import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import type { Role } from "@/features/administration/roles-menus/api/types/role-menu"
import { roleMenuKeys } from "@/features/administration/roles-menus/api/query-keys"

function createRole({ name }: { name: string }): Promise<Role> {
  return evalCol.postRow<Role>("/roles", { name })
}

interface UseCreateRoleOptions {
  mutationConfig?: MutationConfig<typeof createRole>
}

export function useCreateRole({ mutationConfig }: UseCreateRoleOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRole,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: roleMenuKeys.roles })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
