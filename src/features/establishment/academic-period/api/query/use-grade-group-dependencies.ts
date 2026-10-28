import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

interface GradeGroupDependenciesRow {
  matriculas: number
  asignaciones: number
  horarios: number
  actividades: number
  clases_asistencia: number
  calificaciones: number
}

// Lo que impide eliminar un grupo (`fn_grupo_dependencias`): lo mismo que
// revisa `fn_grupo_validar_eliminable` en el back. Con todo en 0 se puede eliminar.
export interface GradeGroupDependencies {
  matriculas: number
  asignaciones: number
  horarios: number
  actividades: number
  clasesAsistencia: number
  calificaciones: number
}

export const hasGradeGroupDependencies = (d: GradeGroupDependencies) =>
  Object.values(d).some((n) => n > 0)

async function fetchGradeGroupDependencies(id: number): Promise<GradeGroupDependencies> {
  const [row] = await evalCol.getRows<GradeGroupDependenciesRow>(`/grupos/${id}/dependencias`)
  return {
    matriculas: Number(row?.matriculas ?? 0),
    asignaciones: Number(row?.asignaciones ?? 0),
    horarios: Number(row?.horarios ?? 0),
    actividades: Number(row?.actividades ?? 0),
    clasesAsistencia: Number(row?.clases_asistencia ?? 0),
    calificaciones: Number(row?.calificaciones ?? 0),
  }
}

export function useGradeGroupDependenciesQuery(id: number, enabled: boolean) {
  return useQuery({
    queryKey: academicPeriodKeys.gradeGroups.dependencies(id),
    queryFn: () => fetchGradeGroupDependencies(id),
    enabled,
    // Siempre fresco: entre aperturas pudo matricularse o calificarse algo.
    staleTime: 0,
  })
}
