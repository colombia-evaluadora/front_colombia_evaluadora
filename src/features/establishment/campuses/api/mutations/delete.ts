import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { invalidateCampuses } from "@/features/establishment/campuses/api/mutations/invalidate-campuses"
import type { MutationConfig } from "@/lib/react-query"

export interface DeleteCampusResult {
  status: "ok" | "error"
  message: string
}

/** PUT, no DELETE: el real es borrado lógico (`fn_sed_soft_delete`). */
function deleteCampus(id: number): Promise<DeleteCampusResult> {
  const url = apiPath(`/establishments/campuses/${id}`, `/establecimientos/sedes/${id}`)
  return env.ENABLE_API_MOCKING ? api.delete(url) : api.put(url)
}

interface UseDeleteOptions {
  mutationConfig?: MutationConfig<typeof deleteCampus>
}

export function useDelete({ mutationConfig }: UseDeleteOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteCampus,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateCampuses(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}