import type { EvaluationPeriodStatusOption } from "@/features/establishment/academic-period/api/types/evaluation-period"

// Catálogo de estados de período de evaluación. Simula lo que en producción
// entrega el backend (`key` + `label`), de modo que el front no hardcodee las
// opciones del select ni sus etiquetas.
export const evaluationPeriodStatusesDb: EvaluationPeriodStatusOption[] = [
  { key: "NO Calificable", label: "NO Calificable" },
  { key: "Calificable", label: "Calificable" },
  { key: "En Recuperaciones", label: "En Recuperaciones" },
  {
    key: "Habilitados para algunas asignaturas",
    label: "Habilitados para algunas asignaturas",
  },
]
