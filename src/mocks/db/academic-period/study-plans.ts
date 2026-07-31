import type { StudyPlanRecord } from "@/features/establishment/academic-period/api/types/study-plan"

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

// El backend asigna el código al crear; el front no debe generarlo.
export function nextStudyPlanId(): number {
  return studyPlansDb.reduce((max, row) => Math.max(max, row.codigo), 0) + 1
}
