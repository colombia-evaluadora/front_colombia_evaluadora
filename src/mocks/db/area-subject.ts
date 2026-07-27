import type { AreaSubjectRecord } from "@/features/establishment/api/types/academic-period/area-subject"

let nextId = 1

function createAreaSubject(
  overrides: Partial<AreaSubjectRecord> = {}
): AreaSubjectRecord {
  return {
    codigo: nextId++,
    academicPeriodId: 1,
    areaGeneral: "",
    nombreInterno: "",
    abreviacion: "",
    ordenReportes: 1,
    ...overrides,
  }
}

export const areaSubjectsDb: AreaSubjectRecord[] = [
  createAreaSubject({
    codigo: 1,
    academicPeriodId: 1,
    areaGeneral: "MATEMÁTICAS",
    nombreInterno: "MATEMÁTICAS",
    abreviacion: "MATEMÁTICAS",
    ordenReportes: 1,
    color: "#2563eb",
  }),
  createAreaSubject({
    codigo: 2,
    academicPeriodId: 1,
    areaGeneral: "LENGUA CASTELLANA",
    nombreInterno: "LENGUA CASTELLANA",
    abreviacion: "ESPAÑOL",
    ordenReportes: 2,
    color: "#7c3aed",
  }),
  createAreaSubject({
    codigo: 3,
    academicPeriodId: 1,
    areaGeneral: "CIENCIAS NATURALES",
    nombreInterno: "CIENCIAS NATURALES",
    abreviacion: "NATURALES",
    ordenReportes: 3,
    color: "#16a34a",
  }),
  createAreaSubject({
    codigo: 6,
    academicPeriodId: 1,
    areaGeneral: "CIENCIAS SOCIALES",
    nombreInterno: "CIENCIAS SOCIALES",
    abreviacion: "SOCIALES",
    ordenReportes: 4,
    color: "#ea580c",
  }),
  createAreaSubject({
    codigo: 4,
    academicPeriodId: 2,
    areaGeneral: "TECNOLOGÍA E INFORMÁTICA",
    nombreInterno: "INFORMÁTICA",
    abreviacion: "INFORMÁTICA",
    ordenReportes: 1,
    color: "#dc2626",
  }),
  createAreaSubject({
    codigo: 5,
    academicPeriodId: 2,
    areaGeneral: "EDUCACIÓN FÍSICA",
    nombreInterno: "EDUCACIÓN FÍSICA",
    abreviacion: "EDUCACIÓN FÍSICA",
    ordenReportes: 2,
    color: "#0891b2",
  }),
]