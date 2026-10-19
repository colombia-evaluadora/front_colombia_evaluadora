import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import type { Plan } from "@/features/administration/roles-menus/api/types/role-menu"
import { roleMenuKeys } from "@/features/administration/roles-menus/api/query-keys"

function fetchPlans(): Promise<Plan[]> {
  return evalCol.getRows<Plan>("/plans")
}

export function usePlansQuery() {
  return useQuery({
    queryKey: roleMenuKeys.plans,
    queryFn: fetchPlans,
    staleTime: Infinity,
  })
}

function createPlan({ name }: { name: string }): Promise<Plan> {
  return evalCol.postRow<Plan>("/plans", { name })
}

export function useCreatePlan({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof createPlan> } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createPlan,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: roleMenuKeys.plans })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
