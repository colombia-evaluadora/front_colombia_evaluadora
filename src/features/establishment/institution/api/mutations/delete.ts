import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

export interface DeleteEstablishmentResult {
  status: "ok" | "error"
  message: string
}

function deleteEstablishment(id: number): Promise<DeleteEstablishmentResult> {
  return api.delete(`/establishments/${id}`)
}

interface UseDeleteOptions {
  mutationConfig?: MutationConfig<typeof deleteEstablishment>
}

export function useDelete({
  mutationConfig,
}: UseDeleteOptions = {}) {
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