import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { updateEstablishment } from "./create-establishment"
import type { EstablishmentDetails } from "../types/establishment"

interface UpdateEstablishmentInput {
  establishmentId: string
  values: EstablishmentDetails
}

function updateEstablishmentMutation({
  establishmentId,
  values,
}: UpdateEstablishmentInput) {
  return updateEstablishment(establishmentId, values)
}

interface UseUpdateEstablishmentOptions {
  mutationConfig?: MutationConfig<typeof updateEstablishmentMutation>
}

export function useUpdateEstablishment({
  mutationConfig,
}: UseUpdateEstablishmentOptions = {}) {
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