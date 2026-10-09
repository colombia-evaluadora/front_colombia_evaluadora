import type { EvaluationPeriodStatusOption } from "@/features/establishment/academic-period/api/types/evaluation-period"

// Simula `GET /eval-col/select/ESTADOPERIODOEVALUACION`.
export const evaluationPeriodStatusesDb: EvaluationPeriodStatusOption[] = [
  { id: 249, key: "1", label: "Calificable" },
  { id: 250, key: "2", label: "NO Calificable" },
]
