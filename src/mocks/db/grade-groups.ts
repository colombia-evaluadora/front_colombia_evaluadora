import type { GradeGroupRecord } from "@/features/establishment/api/types/academic-period/grade-group"

export const gradeGroupsDb: GradeGroupRecord[] = [
  {
    gradeId: 1,
    codigo: "001",
    jornada: "Mañana",
    director: "LUZ MARINA RIOS VARGAS",
    planEstudio: "Plan Transición",
    metodologia: "Tradicional",
    cupo: 30,
  },
  {
    gradeId: 1,
    codigo: "002",
    jornada: "Tarde",
    director: "",
    planEstudio: "Plan Transición",
    metodologia: "Tradicional",
    cupo: 30,
  },
  {
    gradeId: 7,
    codigo: "601",
    jornada: "Mañana",
    director: "ANA SOFIA CASTRO LEON",
    planEstudio: "Plan Sexto",
    metodologia: "Tradicional",
    cupo: 35,
  },
  {
    gradeId: 7,
    codigo: "602",
    jornada: "Tarde",
    director: "",
    planEstudio: "Plan Sexto",
    metodologia: "Tradicional",
    cupo: 35,
  },
]
