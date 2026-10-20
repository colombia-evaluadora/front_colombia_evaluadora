import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/academic-period"
import { invalidateAcademicPeriodRelated } from "./invalidate"

// Soft delete expuesto como PUT.
function deleteAcademicPeriod(id: number): Promise<MutationResult> {
  return api.put(`/eval-col/periodos-academicos/${id}`)
}

interface UseDeleteAcademicPeriodOptions {
  mutationConfig?: MutationConfig<typeof deleteAcademicPeriod>
}

export function useDeleteAcademicPeriod({ mutationConfig }: UseDeleteAcademicPeriodOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAcademicPeriod,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateAcademicPeriodRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
