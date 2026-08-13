import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { updateEstablishment } from "@/features/establishment/institution/api/mutations/create"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

interface UpdateEstablishmentInput {
  establishmentId: number
  values: EstablishmentDetails
}

function updateEstablishmentMutation({
  establishmentId,
  values,
}: UpdateEstablishmentInput) {
  return updateEstablishment(establishmentId, values)
}

interface UseUpdateOptions {
  mutationConfig?: MutationConfig<typeof updateEstablishmentMutation>
}

export function useUpdate({
  mutationConfig,
}: UseUpdateOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateEstablishmentMutation,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["establishments"] })
      queryClient.invalidateQueries({ queryKey: ["establishments", "query"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}