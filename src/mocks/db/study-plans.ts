import type { StudyPlanItem } from "@/features/establishment/api/types/academic-period/study-plan"

let nextId = 1

export const studyPlansDb: StudyPlanItem[] = [
  {
    codigo: nextId++,
    asignatura: "MATEMÁTICAS",
    intensidadHoraria: 4,
    influenciaArea: 50,
    numeroCreditos: 3,
    influyeDesempeno: true,
  },
  {
    codigo: nextId++,
    asignatura: "CIENCIAS SOCIALES",
    intensidadHoraria: 4,
    influenciaArea: 40,
    numeroCreditos: 3,
    influyeDesempeno: true,
  },
  {
    codigo: nextId++,
    asignatura: "CIENCIAS NATURALES",
    intensidadHoraria: 4,
    influenciaArea: 10,
    numeroCreditos: 3,
    influyeDesempeno: true,
  },
]
