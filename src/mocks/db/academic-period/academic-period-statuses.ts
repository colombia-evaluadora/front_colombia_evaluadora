import type { AcademicPeriodStatusOption } from "@/features/establishment/academic-period/api/types/academic-period"

// Catálogo de estados de período académico. Simula lo que en producción entrega
// el backend (`key` + `label`), de modo que el front no hardcodee las opciones
// del select ni sus etiquetas.
export const academicPeriodStatusesDb: AcademicPeriodStatusOption[] = [
  { key: "ACTIVO", label: "Activo" },
  { key: "INACTIVO", label: "Inactivo" },
]
