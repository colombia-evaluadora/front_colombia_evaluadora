import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { CreateAreaSubjectRequest, AreaSubject } from "../../types/area-subject"

function createAreaSubject(
  input: CreateAreaSubjectRequest
): Promise<AreaSubject> {
  return api.post("/area-subjects", input)
}

interface UseCreateAreaSubjectOptions {
  mutationConfig?: MutationConfig<typeof createAreaSubject>
}

export function useCreateAreaSubject({
  mutationConfig,
}: UseCreateAreaSubjectOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAreaSubject,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["area-subjects"] })
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
