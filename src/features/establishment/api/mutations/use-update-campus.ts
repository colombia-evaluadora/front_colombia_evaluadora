import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { updateCampus } from "./create-campus"
import type { Campus } from "../types/campus"

interface UpdateCampusInput {
  campusId: string
  values: Campus
}

function updateCampusMutation({ campusId, values }: UpdateCampusInput) {
  return updateCampus(campusId, values)
}

interface UseUpdateCampusOptions {
  mutationConfig?: MutationConfig<typeof updateCampusMutation>
}

export function useUpdateCampus({ mutationConfig }: UseUpdateCampusOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateCampusMutation,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["campuses"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}