import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import { rolesQueryKey } from "@/features/administration/roles-menus/api/query/use-roles-query"
import type { Role } from "@/features/administration/roles-menus/api/types/role-menu"

function createRole({ name }: { name: string }): Promise<Role> {
  return api.post("/roles", { name })
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
      queryClient.invalidateQueries({ queryKey: rolesQueryKey() })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
