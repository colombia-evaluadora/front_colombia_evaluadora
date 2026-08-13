import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "../../types/academic-period"

// `fn_periodo_soft_delete` es un soft delete expuesto como PUT
// (`PUT /periodos-academicos/:ID`), no como DELETE.
function deleteAcademicPeriod(id: number): Promise<MutationResult> {
  return api.put(`/eval-col/periodos-academicos/${id}`)
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
