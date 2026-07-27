import type { StudyPlanRecord } from "@/features/establishment/api/types/academic-period/study-plan"

let nextId = 1

export const studyPlansDb: StudyPlanRecord[] = [
  {
    codigo: nextId++,
    academicPeriodId: 1,
    gradeId: 1,
    asignatura: "MATEMÁTICAS",
    intensidadHoraria: 4,
    influenciaArea: 50,
    numeroCreditos: 3,
    influyeDesempeno: true,
  },
  {
    codigo: nextId++,
    academicPeriodId: 1,
    gradeId: 1,
    asignatura: "CIENCIAS SOCIALES",
    intensidadHoraria: 4,
    influenciaArea: 40,
    numeroCreditos: 3,
    influyeDesempeno: true,
  },
  {
    codigo: nextId++,
    academicPeriodId: 1,
    gradeId: 1,
    asignatura: "CIENCIAS NATURALES",
    intensidadHoraria: 3,
    influenciaArea: 10,
    numeroCreditos: 3,
    influyeDesempeno: true,
  },
  {
    codigo: nextId++,
    academicPeriodId: 2,
    gradeId: 7,
    asignatura: "INFORMÁTICA",
    intensidadHoraria: 2,
    influenciaArea: 60,
    numeroCreditos: 2,
    influyeDesempeno: true,
  },
  {
    codigo: nextId++,
    academicPeriodId: 2,
    gradeId: 7,
    asignatura: "EDUCACIÓN FÍSICA",
    intensidadHoraria: 2,
    influenciaArea: 40,
    numeroCreditos: 2,
    influyeDesempeno: false,
  },
]
