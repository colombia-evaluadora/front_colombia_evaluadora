import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { update } from "@/features/academic-management/curricular-references/api/mutations/create"
import type { CurricularReferenceDraft } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

function updateCurricularReference({ id, values }: { id: number; values: CurricularReferenceDraft }) {
  return update(id, values)
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
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
