import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

// Ids de asignaturas ya asignadas a un docente en el periodo.
// Identifica al docente por `funcionarioId` (PK_TFUNCIONARIO), que viene del
// listado de funcionarios del módulo de establecimientos.
//
// El backend (`fn_asignacion_docente`) devuelve `[{assignment_id:"grupo:asig"}]`,
// pero el mock/otros endpoints devuelven `string[]`. Normalizamos a `string[]`
// para tolerar ambas formas.
async function fetchTeacherAssignments(
  academicPeriodId: number,
  funcionarioId: string
): Promise<string[]> {
  // El interceptor de respuesta desenvuelve `response.data`, pero el tipo de
  // `api.get` no lo refleja; casteamos el resultado a la forma esperada.
  const data = (await api.get(
    `/academic-periods/${academicPeriodId}/teachers/${funcionarioId}/assignments`
  )) as unknown as Array<string | { assignment_id: string }>
  return data.map((item) =>
    typeof item === "string" ? item : item.assignment_id
  )
}

export const teacherAssignmentsQueryKey = (
  academicPeriodId: number,
  funcionarioId: string
) => ["teacher-assignments", academicPeriodId, funcionarioId]

export function useTeacherAssignmentsQuery(
  academicPeriodId: number | undefined,
  funcionarioId: string | undefined
) {
  return useQuery({
    queryKey: teacherAssignmentsQueryKey(
      academicPeriodId ?? 0,
      funcionarioId ?? ""
    ),
    queryFn: () =>
      fetchTeacherAssignments(
        academicPeriodId as number,
        funcionarioId as string
      ),
    enabled: academicPeriodId != null && funcionarioId != null,
  })
}
