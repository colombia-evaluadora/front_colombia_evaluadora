import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query"

import type { MutationResult } from "../types/payment"
import type { PaymentFormValues } from "../schema"

async function createPayment(values: PaymentFormValues): Promise<MutationResult> {
  const response = await fetch("/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  })
  return response.json()
}

interface UseCreatePaymentOptions {
  mutationConfig?: UseMutationOptions<MutationResult, Error, PaymentFormValues>
}

export function useCreatePayment({ mutationConfig }: UseCreatePaymentOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createPayment,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
