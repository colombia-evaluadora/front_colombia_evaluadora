import { useQuery } from "@tanstack/react-query"

import { fetchAcademicPeriods } from "@/features/establishment/academic-period/api/query/use-academic-periods"
import type { EnrollmentModality } from "@/features/establishment/academic-period/api/types/academic-period"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"

const MODALIDAD: Record<EnrollmentModality, string> = {
  ANUAL: "Anual",
  SEMESTRAL: "Semestral",
  TRIMESTRAL: "Trimestral",
  BIMESTRAL: "Bimestral",
}

export interface MatriculaPeriodoOption {
  value: string
  /** "2027 · Anual · Ciclo 1", como el prototipo C.1.LIS. */
  label: string
}

/** Periodos Abiertos de la sede y jornada: los únicos que lista Matrícula (Regla 54). */
export function useMatriculaPeriodosAbiertosQuery(sedeId: number | null, jornadaId: number | null) {
  return useQuery({
    queryKey: matriculaKeys.periodosAbiertos(sedeId, jornadaId),
    queryFn: async (): Promise<MatriculaPeriodoOption[]> => {
      const { rows } = await fetchAcademicPeriods({
        filters: { sedeId: sedeId ?? undefined, jornadaId: jornadaId ?? undefined },
        sorting: [],
        pageIndex: 0,
        pageSize: 100,
      })
      return rows
        .filter((periodo) => periodo.status === "A")
        .sort((a, b) => b.schoolYearId - a.schoolYearId || (a.cycle ?? 1) - (b.cycle ?? 1))
        .map((periodo) => ({
          value: String(periodo.id),
          label: `${periodo.schoolYearId} · ${MODALIDAD[periodo.enrollmentModality ?? "ANUAL"]} · Ciclo ${periodo.cycle ?? 1}`,
        }))
    },
    enabled: sedeId != null && jornadaId != null,
  })
}
