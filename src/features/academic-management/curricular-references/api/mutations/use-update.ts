import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { update } from "@/features/academic-management/curricular-references/api/mutations/create"
import type { CurricularReferenceDraft } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

function updateCurricularReference({
  id,
  values,
  previousActive,
}: {
  id: number
  values: CurricularReferenceDraft
  previousActive?: boolean
}) {
  return update(id, values, previousActive)
}

interface UseUpdateOptions {
  mutationConfig?: MutationConfig<typeof updateCurricularReference>
}

export function useUpdate({ mutationConfig }: UseUpdateOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateCurricularReference,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["curricular-references"] })
      queryClient.invalidateQueries({ queryKey: ["curricular-reference"] })
      queryClient.invalidateQueries({ queryKey: ["curricular-reference-areas"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
