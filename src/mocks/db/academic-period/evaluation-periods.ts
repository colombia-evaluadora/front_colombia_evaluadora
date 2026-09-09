import type { EvaluationPeriodRecord } from "@/features/establishment/academic-period/api/types/evaluation-period"

// Al menos un periodo "vigente" (hoy cae dentro de su rango) — sin esto, el
// paso "rango de fechas" del filtro en cascada de la Planilla de
// calificación (`FiltroPlanillaCascada`, que filtra por vigencia) queda
// siempre vacío en modo mock.
export const evaluationPeriodsDb: EvaluationPeriodRecord[] = [
  {
    id: 1,
    codigo: "P1-2026",
    nombre: "Primer periodo",
    abreviacion: "P1",
    startDate: "2026-08-01",
    endDate: "2026-10-15",
    peso: 25,
    estado: "1",
    estadoId: 249,
    estadoName: "Calificable",
    academicPeriodId: 1,
  },
  {
    id: 2,
    codigo: "P2-2026",
    nombre: "Segundo periodo",
    abreviacion: "P2",
    startDate: "2026-10-16",
    endDate: "2026-12-15",
    peso: 25,
    estado: "2",
    estadoId: 250,
    estadoName: "NO Calificable",
    academicPeriodId: 1,
  },
]
