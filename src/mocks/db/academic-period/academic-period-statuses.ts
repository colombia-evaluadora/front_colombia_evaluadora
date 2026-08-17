import type { AcademicPeriodStatusOption } from "@/features/establishment/academic-period/api/types/academic-period"

// Catálogo de estados de período académico. Simula lo que en producción entrega
// el backend (`key` + `label`), de modo que el front no hardcodee las opciones
// del select ni sus etiquetas.
// `id` = PK_LISTA_VALOR (lo que el back espera como `p_fk_estado`); `key` = VALOR
// (código estable para el badge); `label` = NOMBRE.
export const academicPeriodStatusesDb: AcademicPeriodStatusOption[] = [
  { id: 1, key: "A", label: "Abierto" },
  { id: 2, key: "C", label: "Cerrado" },
  { id: 3, key: "I", label: "Inscripciones" },
  { id: 4, key: "P", label: "Promociones" },
  { id: 5, key: "N", label: "Nivelaciones" },
]
