import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  SaveTeacherAssignmentsRequest,
} from "@/features/establishment/academic-period/api/types/academic-assignment"
import { teacherAssignmentsQueryKey } from "@/features/establishment/academic-period/api/query/use-teacher-assignments"

function saveTeacherAssignments({
  academicPeriodId,
  documentNumber,
  subjectIds,
}: SaveTeacherAssignmentsRequest): Promise<MutationResult> {
  return api.put(
    `/academic-periods/${academicPeriodId}/teachers/${documentNumber}/assignments`,
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
          variables.documentNumber
        ),
      })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
