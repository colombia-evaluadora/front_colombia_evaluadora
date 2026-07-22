import type { AreaSubject } from "@/features/establishment/api/types/academic-period/area-subject"

let nextId = 1

function createAreaSubject(
  overrides: Partial<AreaSubject> = {}
): AreaSubject {
  return {
    codigo: nextId++,
    areaGeneral: "",
    nombreInterno: "",
    abreviacion: "",
    ordenReportes: 1,
    ...overrides,
  }
}

export const areaSubjectsDb: AreaSubject[] = [
  createAreaSubject({
    codigo: 1,
    areaGeneral: "MATEMÁTICAS",
    nombreInterno: "MATEMÁTICAS",
    abreviacion: "MATEMÁTICAS",
    ordenReportes: 1,
  }),
  createAreaSubject({
    codigo: 2,
    areaGeneral: "LENGUA CASTELLANA",
    nombreInterno: "LENGUA CASTELLANA",
    abreviacion: "ESPAÑOL",
    ordenReportes: 2,
  }),
  createAreaSubject({
    codigo: 3,
    areaGeneral: "CIENCIAS NATURALES",
    nombreInterno: "CIENCIAS NATURALES",
    abreviacion: "NATURALES",
    ordenReportes: 3,
  }),
  createAreaSubject({
    codigo: 4,
    areaGeneral: "TECNOLOGÍA E INFORMÁTICA",
    nombreInterno: "TECNOLOGÍA E INFORMÁTICA",
    abreviacion: "INFORMÁTICA",
    ordenReportes: 4,
  }),
  createAreaSubject({
    codigo: 5,
    areaGeneral: "EDUCACIÓN FÍSICA",
    nombreInterno: "EDUCACIÓN FÍSICA",
    abreviacion: "EDUCACIÓN FÍSICA",
    ordenReportes: 5,
  }),
]