import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

function deleteCurricularReference(id: number) {
  return api.delete<{ status: "ok" | "error"; message: string }>(
    `/academic-management/curricular-references/${id}`,
  )
}

interface UseDeleteOptions {
  mutationConfig?: MutationConfig<typeof deleteCurricularReference>
}

export function useDelete({ mutationConfig }: UseDeleteOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteCurricularReference,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["curricular-references"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
