import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

export interface DeleteEstablishmentResult {
  status: "ok" | "error"
  message: string
}

function deleteEstablishment(id: string): Promise<DeleteEstablishmentResult> {
  return api.delete(`/establishments/${id}`)
}

interface UseDeleteEstablishmentOptions {
  mutationConfig?: MutationConfig<typeof deleteEstablishment>
}

export function useDeleteEstablishment({
  mutationConfig,
}: UseDeleteEstablishmentOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteEstablishment,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["establishments"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}