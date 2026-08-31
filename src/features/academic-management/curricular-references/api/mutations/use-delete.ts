import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"

function deleteCurricularReference(id: number) {
  const url = apiPath(
    `/academic-management/curricular-references/${id}`,
    `/referentes-curriculares/${id}/eliminar`,
  )
  if (env.ENABLE_API_MOCKING) {
    return api.delete<{ status: "ok" | "error"; message: string }>(url)
  }
  return api.patch<{ status?: "ok" | "error"; message?: string }>(url)
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
