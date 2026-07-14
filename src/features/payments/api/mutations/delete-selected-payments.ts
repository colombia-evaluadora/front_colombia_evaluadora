import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query"

import type { MutationResult } from "../types/payment"

async function deleteSelectedPayments(ids: string[]): Promise<MutationResult> {
  const response = await fetch("/payments/bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids),
  })
  return response.json()
}

interface UseDeleteSelectedPaymentsOptions {
  mutationConfig?: UseMutationOptions<MutationResult, Error, string[]>
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
