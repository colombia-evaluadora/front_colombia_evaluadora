import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query"

import type { MutationResult } from "../types/payment"

async function deletePayment(id: string): Promise<MutationResult> {
  const response = await fetch(`/payments/${id}`, { method: "DELETE" })
  return response.json()
}

interface UseDeletePaymentOptions {
  mutationConfig?: UseMutationOptions<MutationResult, Error, string>
}

export function useDeletePayment({ mutationConfig }: UseDeletePaymentOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deletePayment,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
