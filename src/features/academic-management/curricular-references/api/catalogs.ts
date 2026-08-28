import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

// Catálogos propios de la pantalla, sin endpoint de backend: se comparten
// entre los componentes del front y el seed de datos mock (ver
// `mocks/db/academic-management/curricular-references.ts`) para que ambos
// lados hablen de los mismos ids.
export const EDUCATION_LEVELS: CatalogItem[] = [
  { id: 101, code: "PREESCOLAR", name: "Preescolar" },
  { id: 102, code: "PRIMARIA", name: "Básica primaria" },
  { id: 103, code: "SECUNDARIA", name: "Básica secundaria" },
  { id: 104, code: "MEDIA", name: "Media" },
]

export const EVALUATION_TYPES: CatalogItem[] = [
  { id: 111, code: "DIAGNOSTICA", name: "Diagnóstica" },
  { id: 112, code: "FORMATIVA", name: "Formativa" },
  { id: 113, code: "SUMATIVA", name: "Sumativa" },
]

export const PEDAGOGICAL_APPROACHES: CatalogItem[] = [
  { id: 121, code: "CONSTRUCTIVISMO", name: "Constructivismo" },
  { id: 122, code: "APRENDIZAJE_SIGNIFICATIVO", name: "Aprendizaje significativo" },
  { id: 123, code: "APRENDIZAJE_PROBLEMAS", name: "Aprendizaje basado en problemas" },
  { id: 124, code: "COMPETENCIAS", name: "Enfoque por competencias" },
  { id: 125, code: "CRITICA", name: "Pedagogía crítica" },
]
