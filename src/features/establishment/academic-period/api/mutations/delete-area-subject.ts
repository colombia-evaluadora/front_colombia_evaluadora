import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/area-subject"
import { invalidateAreaSubjectRelated } from "./invalidate"

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
      invalidateAreaSubjectRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
