import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query"

import type { MutationResult, PaymentsQueryRequest } from "../types/payment"

async function deleteAllPayments(
  filters: PaymentsQueryRequest["filters"]
): Promise<MutationResult> {
  const response = await fetch("/payments/delete-all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(filters),
  })
  return response.json()
}

interface UseDeleteAllPaymentsOptions {
  mutationConfig?: UseMutationOptions<
    MutationResult,
    Error,
    PaymentsQueryRequest["filters"]
  >
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
