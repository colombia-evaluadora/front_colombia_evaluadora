import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

export interface DeleteCampusResult {
  status: "ok" | "error"
  message: string
}

function deleteCampus(id: string): Promise<DeleteCampusResult> {
  return api.delete(`/campuses/${id}`)
}

interface UseDeleteCampusOptions {
  mutationConfig?: MutationConfig<typeof deleteCampus>
}

export function useDeleteCampus({ mutationConfig }: UseDeleteCampusOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteCampus,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["campuses"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}