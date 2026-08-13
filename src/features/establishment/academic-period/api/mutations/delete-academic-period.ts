import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/academic-period"

function deleteAcademicPeriod(id: number): Promise<MutationResult> {
  return api.delete(`/academic-periods/${id}`)
}

interface UseDeleteAcademicPeriodOptions {
  mutationConfig?: MutationConfig<typeof deleteAcademicPeriod>
}

export function useDeleteAcademicPeriod({
  mutationConfig,
}: UseDeleteAcademicPeriodOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAcademicPeriod,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["academic-periods"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
