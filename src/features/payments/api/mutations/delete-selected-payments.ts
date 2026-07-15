import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "../types/payment"

function deleteSelectedPayments(ids: string[]): Promise<MutationResult> {
  return api.post("/payments/bulk-delete", ids)
}

interface UseDeleteSelectedPaymentsOptions {
  mutationConfig?: MutationConfig<typeof deleteSelectedPayments>
}

export function useDeleteSelectedPayments({
  mutationConfig,
}: UseDeleteSelectedPaymentsOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSelectedPayments,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
