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
    subjects: [],
    ...overrides,
  }
}

export const areaSubjectsDb: AreaSubjectRecord[] = [
  createAreaSubject({
    codigo: 1,
    academicPeriodId: 1,
    areaGeneral: "Matemáticas",
    nombreInterno: "MATEMÁTICAS",
    abreviacion: "MAT",
    ordenReportes: 1,
    subjects: [
      {
        asignaturaGeneral: "Matemáticas",
        nombreInterno: "Aritmética",
        abreviacion: "ARIT",
        ordenReportes: 1,
        color: "#2563eb",
      },
      {
        asignaturaGeneral: "Matemáticas",
        nombreInterno: "Geometría",
        abreviacion: "GEO",
        ordenReportes: 2,
      },
    ],
  }),
  createAreaSubject({
    codigo: 2,
    academicPeriodId: 1,
    areaGeneral: "Humanidades y Lengua Castellana",
    nombreInterno: "LENGUA CASTELLANA",
    abreviacion: "ESPAÑOL",
    ordenReportes: 2,
    subjects: [
      {
        asignaturaGeneral: "Humanidades y Lengua Castellana",
        nombreInterno: "Lengua Castellana",
        abreviacion: "LENG",
        ordenReportes: 1,
        color: "#7c3aed",
      },
    ],
  }),
  createAreaSubject({
    codigo: 3,
    academicPeriodId: 1,
    areaGeneral: "Ciencias Naturales y Educación Ambiental",
    nombreInterno: "CIENCIAS NATURALES",
    abreviacion: "NATURALES",
    ordenReportes: 3,
    subjects: [
      {
        asignaturaGeneral: "Ciencias Naturales y Educación Ambiental",
        nombreInterno: "Biología",
        abreviacion: "BIO",
        ordenReportes: 1,
        color: "#16a34a",
      },
      {
        asignaturaGeneral: "Ciencias Naturales Química",
        nombreInterno: "Química",
        abreviacion: "QUIM",
        ordenReportes: 2,
        color: "#0d9488",
      },
    ],
  }),
  createAreaSubject({
    codigo: 4,
    academicPeriodId: 2,
    areaGeneral: "Tecnología e Informática",
    nombreInterno: "INFORMÁTICA",
    abreviacion: "INFO",
    ordenReportes: 1,
    subjects: [
      {
        asignaturaGeneral: "Tecnología e Informática",
        nombreInterno: "Informática",
        abreviacion: "INFO",
        ordenReportes: 1,
        color: "#dc2626",
      },
    ],
  }),
  createAreaSubject({
    codigo: 5,
    academicPeriodId: 2,
    areaGeneral: "Educ. Física, Recreación y Deporte",
    nombreInterno: "EDUCACIÓN FÍSICA",
    abreviacion: "EDU. FÍS.",
    ordenReportes: 2,
    subjects: [],
  }),
]
