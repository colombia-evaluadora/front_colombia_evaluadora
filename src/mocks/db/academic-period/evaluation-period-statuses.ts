import type { EvaluationPeriodStatus } from "@/features/establishment/academic-period/api/types/evaluation-period"

// Catálogo de estados de período de evaluación. Simula lo que en producción
// entrega el backend, de modo que el front no hardcodee las opciones del
// select.
export const evaluationPeriodStatusesDb: EvaluationPeriodStatus[] = [
  "NO Calificable",
  "Calificable",
  "En Recuperaciones",
  "Habilitados para algunas asignaturas",
]