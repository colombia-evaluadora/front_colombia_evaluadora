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

// "Tipo de evaluación" describe CÓMO se mide (la naturaleza del dato que
// produce el instrumento), no cuándo se aplica — eso es `PEDAGOGICAL_APPROACHES`
// de abajo. Tres valores nada más: cualitativa, cuantitativa, o ambas a la vez
// (un instrumento puede traer una nota numérica y una valoración descriptiva).
export const EVALUATION_TYPES: CatalogItem[] = [
  { id: 111, code: "CUALITATIVA", name: "Cualitativa" },
  { id: 112, code: "CUANTITATIVA", name: "Cuantitativa" },
  { id: 113, code: "CUANTITATIVA_CUALITATIVA", name: "Cuantitativa y cualitativa" },
]

// "Enfoque pedagógico" acá es binario: si el referente está pensado para
// hacer seguimiento continuo del aprendizaje (FORMATIVO) o para calificar un
// resultado (EVALUATIVO). Gobierna una regla de negocio en el Planeador: una
// unidad temática ligada a un referente FORMATIVO no admite actividades
// sumativas — ver `EvaluacionSection` en `form-editar-actividad.tsx`.
export const PEDAGOGICAL_APPROACHES: CatalogItem[] = [
  { id: 121, code: "EVALUATIVO", name: "Evaluativo" },
  { id: 122, code: "FORMATIVO", name: "Formativo" },
]
