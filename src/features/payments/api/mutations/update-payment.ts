import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "../types/payment"
import type { PaymentFormValues } from "../schema"

interface UpdatePaymentInput {
  id: string
  values: PaymentFormValues
}

function updatePayment({ id, values }: UpdatePaymentInput): Promise<MutationResult> {
  return api.patch(`/payments/${id}`, values)
}

interface UseUpdatePaymentOptions {
  mutationConfig?: MutationConfig<typeof updatePayment>
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
