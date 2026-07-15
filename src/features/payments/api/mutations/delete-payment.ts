import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "../types/payment"

function deletePayment(id: string): Promise<MutationResult> {
  return api.delete(`/payments/${id}`)
}

interface UseDeletePaymentOptions {
  mutationConfig?: MutationConfig<typeof deletePayment>
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
