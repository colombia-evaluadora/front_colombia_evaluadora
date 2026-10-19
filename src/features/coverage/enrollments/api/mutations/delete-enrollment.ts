import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

export interface DeleteEnrollmentResult {
  status: "ok" | "error"
  message: string
}

function deleteEnrollment(id: string): Promise<DeleteEnrollmentResult> {
  return api.delete(`/coverage/enrollments/${id}`)
}

interface UseDeleteEnrollmentOptions {
  mutationConfig?: MutationConfig<typeof deleteEnrollment>
}

export function useDeleteEnrollment({ mutationConfig }: UseDeleteEnrollmentOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteEnrollment,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
