import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { Enrollment } from "@/features/coverage/api/types/enrollment"

export interface UpdateEnrollmentResult {
  status: "ok" | "error"
  message: string
}

function updateEnrollment(enrollment: Enrollment): Promise<UpdateEnrollmentResult> {
  const { id, ...changes } = enrollment
  return api.put(`/coverage/enrollments/${id}`, changes)
}

interface UseUpdateEnrollmentOptions {
  mutationConfig?: MutationConfig<typeof updateEnrollment>
}

export function useUpdateEnrollment({ mutationConfig }: UseUpdateEnrollmentOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateEnrollment,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
