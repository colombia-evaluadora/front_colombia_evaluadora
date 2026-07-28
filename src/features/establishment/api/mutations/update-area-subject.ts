import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateAreaSubjectRequest,
} from "../types/academic-period/area-subject"

interface UpdateAreaSubjectInput {
  codigo: number
  values: UpdateAreaSubjectRequest
}

function updateAreaSubject({
  codigo,
  values,
}: UpdateAreaSubjectInput): Promise<MutationResult> {
  return api.patch(`/area-subjects/${codigo}`, values)
}

interface UseUpdateAreaSubjectOptions {
  mutationConfig?: MutationConfig<typeof updateAreaSubject>
}

export function useUpdateAreaSubject({
  mutationConfig,
}: UseUpdateAreaSubjectOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAreaSubject,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["area-subjects"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
