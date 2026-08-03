import type { CurriculumNodeOption } from "@/features/establishment/academic-period/api/types/curriculum-node"

// Catálogo de nodos curriculares. Simula lo que en producción entrega el
// backend (`key` + `label`), de modo que el front no hardcodee las opciones del
// select ni sus etiquetas.
export const curriculumNodesDb: CurriculumNodeOption[] = [
  { key: "AS", label: "Asignatura" },
  { key: "AR", label: "Área" },
]