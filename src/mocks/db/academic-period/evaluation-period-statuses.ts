import type { EvaluationPeriodStatusOption } from "@/features/establishment/academic-period/api/types/evaluation-period"

// Catálogo de estados de período de evaluación. Simula lo que en producción
// entrega el backend (`key` + `label`), de modo que el front no hardcodee las
// opciones del select ni sus etiquetas.
// `id` = PK_LISTA_VALOR (lo que el back espera como `p_fk_estado`); `key` = VALOR
// (código estable para el badge); `label` = NOMBRE.
// Ids/códigos confirmados por ThunderClient (`GET /eval-col/select/ESTADOPERIODOEVALUACION`).
export const evaluationPeriodStatusesDb: EvaluationPeriodStatusOption[] = [
  { id: 249, key: "1", label: "Calificable" },
  { id: 250, key: "2", label: "NO Calificable" },
  { id: 251, key: "3", label: "Habilitados para algunas asignaturas" },
  { id: 252, key: "4", label: "En Recuperaciones" },
]
