import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  SaveTeacherAssignmentsRequest,
} from "../../types/academic-assignment"
import { teacherAssignmentsQueryKey } from "../../query/academic-assignments/use-teacher-assignments-query"

function saveTeacherAssignments({
  academicPeriodId,
  documento,
  subjectIds,
}: SaveTeacherAssignmentsRequest): Promise<MutationResult> {
  return api.put(
    `/academic-periods/${academicPeriodId}/teachers/${documento}/assignments`,
    { subjectIds }
  )
}

interface UseSaveTeacherAssignmentsOptions {
  mutationConfig?: MutationConfig<typeof saveTeacherAssignments>
}

export function useSaveTeacherAssignments({
  mutationConfig,
}: UseSaveTeacherAssignmentsOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveTeacherAssignments,
    ...mutationConfig,
    onSuccess: (...args) => {
      const [, variables] = args
      queryClient.invalidateQueries({
        queryKey: teacherAssignmentsQueryKey(
          variables.academicPeriodId,
          variables.documento
        ),
      })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
