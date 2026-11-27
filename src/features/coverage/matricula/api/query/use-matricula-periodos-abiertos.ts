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
  /** Fecha límite de matrícula ya pasó (AGR.5): se lista deshabilitado. */
  vencido: boolean
  /** Estado Abierto: los únicos que se ofrecen para matricular (Regla 54). */
  abierto: boolean
}

const hoy = () => new Date().toISOString().slice(0, 10)

/**
 * Periodos Abiertos de la sede y jornada: los únicos que lista Matrícula (Regla 54). `incluirId` suma el periodo
 * de una matrícula ya creada aunque esté Cerrado (detalle y edición): sin él, el selector quedaba vacío y con él
 * Grado y Grupo, que dependen del periodo.
 */
export function useMatriculaPeriodosAbiertosQuery(sedeId: number | null, jornadaId: number | null, incluirId?: string) {
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
        .sort((a, b) => b.schoolYearId - a.schoolYearId || (a.cycle ?? 1) - (b.cycle ?? 1))
        .map((periodo) => ({
          value: String(periodo.id),
          label: `${periodo.schoolYearId} · ${MODALIDAD[periodo.enrollmentModality ?? "ANUAL"]} · Ciclo ${periodo.cycle ?? 1}`,
          vencido: Boolean(periodo.enrollmentDeadline) && periodo.enrollmentDeadline < hoy(),
          abierto: periodo.status === "A",
        }))
    },
    select: (periodos) => periodos.filter((p) => p.abierto || (incluirId != null && p.value === incluirId)),
    enabled: sedeId != null && jornadaId != null,
  })
}
