import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "../types/payment"
import type { PaymentFormValues } from "../schema"

function createPayment(values: PaymentFormValues): Promise<MutationResult> {
  return api.post("/payments", values)
}

interface UseCreatePaymentOptions {
  mutationConfig?: MutationConfig<typeof createPayment>
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
