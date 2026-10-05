import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/area-subject"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

function deleteAreaSubject(codigo: number): Promise<MutationResult> {
  return api.put(`/eval-col/areas/eliminar/${codigo}`)
}

interface UseDeleteAreaSubjectOptions {
  mutationConfig?: MutationConfig<typeof deleteAreaSubject>
}

export function useDeleteAreaSubject({ mutationConfig }: UseDeleteAreaSubjectOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAreaSubject,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.areaSubjects.all })
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.subjects.all })
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.especialidades.all })
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.studyPlans.all })
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.generalAreas() })
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.periodAreas.all })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
