import { evaluationPeriodStatusesDb } from "@/mocks/db/academic-period/evaluation-period-statuses"
import { evaluationPeriodStatusByDates } from "@/features/establishment/academic-period/api/ui-mappings"
import { formatDateValue } from "@/lib/date-value"
import type { EvaluationPeriodRecord } from "@/features/establishment/academic-period/api/types/evaluation-period"

// Al menos un periodo "vigente" (hoy cae dentro de su rango) — sin esto, el
// paso "rango de fechas" del filtro en cascada de la Planilla de
// calificación (`FiltroPlanillaCascada`, que filtra por vigencia) queda
// siempre vacío en modo mock.
function seed(
  id: number,
  academicPeriodId: number,
  n: number,
  startDate: string,
  endDate: string,
  peso: number,
): EvaluationPeriodRecord {
  const today = formatDateValue(new Date())
  const estado = evaluationPeriodStatusByDates(startDate, endDate, today)
  const status = evaluationPeriodStatusesDb.find((s) => s.key === estado)!
  const nombres = ["Primer", "Segundo", "Tercer", "Cuarto"]
  return {
    id,
    codigo: `P${n}-${startDate.slice(0, 4)}`,
    nombre: `${nombres[n - 1]} período`,
    abreviacion: `PE${n}`,
    startDate,
    endDate,
    peso,
    estado,
    estadoId: status.id,
    estadoName: status.label,
    academicPeriodId,
  }
}

// Período 1 suma 100 %; el 2 queda en 60 % para ver el aviso de la Regla 35.
export const evaluationPeriodsDb: EvaluationPeriodRecord[] = [
  seed(1, 1, 1, "2026-01-26", "2026-04-17", 25),
  seed(2, 1, 2, "2026-04-20", "2026-06-26", 25),
  seed(3, 1, 3, "2026-07-13", "2026-09-18", 25),
  seed(4, 1, 4, "2026-09-21", "2026-11-27", 25),
  seed(5, 2, 1, "2026-02-02", "2026-06-12", 30),
  seed(6, 2, 2, "2026-06-15", "2026-10-30", 30),
]
