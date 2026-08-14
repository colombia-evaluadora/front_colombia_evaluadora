import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  SaveTeacherAssignmentsRequest,
} from "@/features/establishment/academic-period/api/types/academic-assignment"
import { teacherAssignmentsQueryKey } from "@/features/establishment/academic-period/api/query/use-teacher-assignments"

// `POST /eval-col/asignaciones` (`fn_asignacion_guardar`, id_query 82) —
// reemplaza TODAS las asignaciones del docente en el periodo (borra las
// activas y reinserta `subjectIds`), no un diff.
function saveTeacherAssignments({
  academicPeriodId,
  funcionarioId,
  subjectIds,
}: SaveTeacherAssignmentsRequest): Promise<MutationResult> {
  return api.post("/eval-col/asignaciones", {
    ACADEMIC_PERIOD_ID: academicPeriodId,
    FK_FUNCIONARIO: funcionarioId,
    SUBJECT_IDS: subjectIds,
  })
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
          variables.funcionarioId
        ),
      })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
