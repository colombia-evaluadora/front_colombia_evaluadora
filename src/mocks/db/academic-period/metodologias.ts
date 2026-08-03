import type { MetodologiaOption } from "@/features/establishment/academic-period/api/types/metodologia"

// Catálogo de metodologías. Simula lo que en producción entrega el backend
// (`key` + `label`), de modo que el front no hardcodee las opciones del select
// ni sus etiquetas.
export const metodologiasDb: MetodologiaOption[] = [
  { key: "Tradicional", label: "Tradicional" },
  { key: "Escuela Nueva", label: "Escuela Nueva" },
  { key: "Aceleración del Aprendizaje", label: "Aceleración del Aprendizaje" },
  { key: "Postprimaria", label: "Postprimaria" },
]
