import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query"

import type { MutationResult } from "../types/payment"
import type { PaymentFormValues } from "../schema"

interface UpdatePaymentInput {
  id: string
  values: PaymentFormValues
}

async function updatePayment({ id, values }: UpdatePaymentInput): Promise<MutationResult> {
  const response = await fetch(`/payments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  })
  return response.json()
}

interface UseUpdatePaymentOptions {
  mutationConfig?: UseMutationOptions<MutationResult, Error, UpdatePaymentInput>
}

export function useUpdatePayment({ mutationConfig }: UseUpdatePaymentOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updatePayment,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
