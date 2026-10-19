import { useMutation, useQueryClient } from "@tanstack/react-query"

import { invalidateCampuses } from "@/features/establishment/campuses/api/mutations/invalidate-campuses"
import type { MutationConfig } from "@/lib/react-query"

import { updateCampus } from "@/features/establishment/campuses/api/mutations/create"
import type { Campus } from "@/features/establishment/campuses/api/types/campus"

interface UpdateCampusInput {
  campusId: number
  values: Campus
}

function updateCampusMutation({ campusId, values }: UpdateCampusInput) {
  return updateCampus(campusId, values)
}

interface UseUpdateOptions {
  mutationConfig?: MutationConfig<typeof updateCampusMutation>
}

export function useUpdate({ mutationConfig }: UseUpdateOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateCampusMutation,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateCampuses(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}