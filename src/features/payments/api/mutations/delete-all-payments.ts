import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult, PaymentsQueryRequest } from "../types/payment"

function deleteAllPayments(
  filters: PaymentsQueryRequest["filters"]
): Promise<MutationResult> {
  return api.post("/payments/delete-all", filters)
}

interface UseDeleteAllPaymentsOptions {
  mutationConfig?: MutationConfig<typeof deleteAllPayments>
}

export function useDeleteAllPayments({
  mutationConfig,
}: UseDeleteAllPaymentsOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAllPayments,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
