import type { EvaluationPeriodStatusOption } from "@/features/establishment/academic-period/api/types/evaluation-period"

// Catálogo de estados de período de evaluación. Simula lo que en producción
// entrega el backend (`key` + `label`), de modo que el front no hardcodee las
// opciones del select ni sus etiquetas.
// `id` = PK_LISTA_VALOR (lo que el back espera como `p_fk_estado`); `key` = VALOR
// (código estable para el badge); `label` = NOMBRE.
export const evaluationPeriodStatusesDb: EvaluationPeriodStatusOption[] = [
  { id: 1, key: "NO Calificable", label: "NO Calificable" },
  { id: 2, key: "Calificable", label: "Calificable" },
  { id: 3, key: "En Recuperaciones", label: "En Recuperaciones" },
  {
    id: 4,
    key: "Habilitados para algunas asignaturas",
    label: "Habilitados para algunas asignaturas",
  },
]
