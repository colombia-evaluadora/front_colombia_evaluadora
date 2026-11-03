import { useQueries } from "@tanstack/react-query"

import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { useGradesQuery } from "@/features/establishment/academic-period/api/query/use-grades"
import {
  fetchGradeGroups,
  type UseGradeGroupsQueryParams,
} from "@/features/establishment/academic-period/api/query/use-grade-groups"
import { fetchHorario } from "@/features/establishment/academic-period/api/query/use-horario"
import {
  fetchStudyPlans,
  type UseStudyPlansQueryParams,
} from "@/features/establishment/academic-period/api/query/use-study-plans"

export type GenerateKind = "horarios" | "planes"

export interface GenerateGroup {
  id: number
  codigo: string
  // Sin horario no entra en el PDF (Sección 5.7, "Sin contenido").
  hasContent: boolean
  // Regla 74: bloques por corregir; Generar pide confirmar.
  affectedBlocks: number
}

export interface GenerateGrade {
  id: number
  nombre: string
  // Planes: el grado tiene plan de estudio. Horarios: algún grupo tiene horario.
  hasContent: boolean
  groups: GenerateGroup[]
}

// Grados del período (y, en horarios, sus grupos) para "Generar" (Sección 5.7).
// Reusa las mismas keys de las pestañas, así comparten caché.
export function usePeriodGenerateData(
  academicPeriodId: number | undefined,
  kind: GenerateKind,
  enabled: boolean,
) {
  const { data: gradesData, isPending: gradesPending } = useGradesQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 200,
    academicPeriodId,
  })
  const grades = enabled ? (gradesData?.rows ?? []) : []

  const groupQueries = useQueries({
    queries: grades.map((grade) => {
      const params: UseGradeGroupsQueryParams = {
        filters: {},
        sorting: [],
        pageIndex: 0,
        pageSize: 100,
        gradeId: grade.id,
      }
      return {
        queryKey: academicPeriodKeys.gradeGroups.list(params),
        queryFn: () => fetchGradeGroups(params),
        enabled: kind === "horarios",
      }
    }),
  })
  const horarioQueries = useQueries({
    queries: grades.map((grade) => ({
      queryKey: academicPeriodKeys.horario.byGrade(grade.id),
      queryFn: () => fetchHorario(grade.id),
      enabled: kind === "horarios",
    })),
  })
  const planQueries = useQueries({
    queries: grades.map((grade) => {
      const params: UseStudyPlansQueryParams = {
        filters: {},
        sorting: [],
        pageIndex: 0,
        pageSize: 100,
        academicPeriodId,
        gradeId: grade.id,
      }
      return {
        queryKey: academicPeriodKeys.studyPlans.list(params),
        queryFn: () => fetchStudyPlans(params),
        enabled: kind === "planes",
      }
    }),
  })

  const queries = kind === "horarios" ? [...groupQueries, ...horarioQueries] : planQueries
  const isPending = gradesPending || queries.some((q) => q.isPending)

  const data: GenerateGrade[] = grades.map((grade, i) => {
    if (kind === "planes") {
      return {
        id: grade.id,
        nombre: grade.nombre,
        hasContent: (planQueries[i]?.data?.rows.length ?? 0) > 0,
        groups: [],
      }
    }
    const schedule = horarioQueries[i]?.data ?? []
    const withSchedule = new Set(schedule.map((e) => e.grupoId))
    const groups = (groupQueries[i]?.data?.rows ?? []).map((g) => ({
      id: g.id,
      codigo: g.codigo,
      hasContent: withSchedule.has(g.id),
      affectedBlocks: schedule.filter((e) => e.grupoId === g.id && e.afectado).length,
    }))
    return {
      id: grade.id,
      nombre: grade.nombre,
      hasContent: groups.some((g) => g.hasContent),
      groups,
    }
  })

  return { data, isPending }
}
