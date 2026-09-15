import {
  EDUCATION_LEVELS,
  EVALUATION_TYPES,
  PEDAGOGICAL_APPROACHES,
} from "@/features/academic-management/curricular-references/api/catalogs"

import type { CurricularReference } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

function level(code: string) {
  return EDUCATION_LEVELS.find((item) => item.code === code) ?? null
}

function levels(code: string) {
  const item = level(code)
  return item ? [item] : []
}

function approach(code: string) {
  return PEDAGOGICAL_APPROACHES.find((item) => item.code === code) ?? null
}

function evaluationType(code: string) {
  return EVALUATION_TYPES.find((item) => item.code === code) ?? null
}

export const curricularReferencesDb: CurricularReference[] = [
  {
    id: 1,
    name: "DBA - Secundaria",
    educationLevels: levels("SECUNDARIA"),
    description: "Derechos Básicos de Aprendizaje para educación básica secundaria.",
    level1: "Enunciado",
    level2: "Evidencia",
    pedagogicalApproach: approach("EVALUATIVO"),
    evaluationType: evaluationType("CUANTITATIVA"),
    subjectLabel: null,
    areas: [
      { id: 15, code: "", name: "Matemáticas" },
      { id: 12, code: "", name: "Humanidades y Lengua Castellana" },
      { id: 3, code: "", name: "Ciencias Naturales y Educación Ambiental" },
    ],
    instrument: "Unidad temática",
    instrumentDescription: "Planes de área, rúbricas e informes de logro.",
    regulation: "Decreto 1290 de 2009.",
    active: true,
    createdYear: 2023,
    deactivatedYear: null,
  },
  {
    id: 2,
    name: "DBA - Media",
    educationLevels: levels("MEDIA"),
    description: "Derechos Básicos de Aprendizaje para educación media.",
    level1: "Enunciado",
    level2: "Evidencia",
    pedagogicalApproach: approach("EVALUATIVO"),
    evaluationType: evaluationType("CUANTITATIVA"),
    subjectLabel: null,
    areas: [],
    instrument: "Unidad temática",
    instrumentDescription: "Planes de área, rúbricas e informes de logro.",
    regulation: "Decreto 1290 de 2009.",
    active: false,
    createdYear: 2021,
    deactivatedYear: 2022,
  },
  {
    id: 3,
    name: "Propósitos e Imprescindibles - Educación Inicial",
    educationLevels: levels("PREESCOLAR"),
    description: "Propósitos de la educación inicial y sus imprescindibles.",
    level1: "Propósito",
    level2: "Imprescindible",
    pedagogicalApproach: approach("FORMATIVO"),
    evaluationType: evaluationType("CUALITATIVA"),
    subjectLabel: null,
    areas: [],
    instrument: "Proyecto pedagógico",
    instrumentDescription: "Relatos pedagógicos, observaciones, registros de desarrollo.",
    regulation: "Decreto 1421 de 2017.",
    active: true,
    createdYear: 2023,
    deactivatedYear: null,
  },
]

// Referentes adicionales, generados a mano: varios por nivel educativo —ya
// no es 1 a 1 con `EDUCATION_LEVELS`— y variados en enfoque/tipo de
// evaluación, para poder probar filtros y paginación con más de una página.
const EXTRA_NAMES = [
  "Mallas de Aprendizaje - Lenguaje",
  "Mallas de Aprendizaje - Matemáticas",
  "Estándares Básicos de Competencias - Ciencias Naturales",
  "Estándares Básicos de Competencias - Ciencias Sociales",
  "Matriz de Referencia - Lenguaje",
  "Matriz de Referencia - Matemáticas",
  "Lineamientos Curriculares - Educación Artística",
  "Orientaciones Pedagógicas - Educación Física",
  "DBA - Preescolar",
  "DBA - Primaria",
  "Referentes de Calidad - Ciudadanía",
  "Referentes de Calidad - Bilingüismo",
]

const EXTRA_LEVEL_CODES = ["PREESCOLAR", "PRIMARIA", "SECUNDARIA", "MEDIA"]

curricularReferencesDb.push(
  ...EXTRA_NAMES.map((name, index) => {
    const active = index % 4 !== 0
    return {
      id: 4 + index,
      name,
      educationLevels: levels(EXTRA_LEVEL_CODES[index % EXTRA_LEVEL_CODES.length]),
      description: `Referente curricular de ejemplo: ${name.toLowerCase()}.`,
      level1: "Enunciado",
      level2: "Evidencia",
      pedagogicalApproach: PEDAGOGICAL_APPROACHES[index % PEDAGOGICAL_APPROACHES.length],
      evaluationType: EVALUATION_TYPES[index % EVALUATION_TYPES.length],
      subjectLabel: null,
      areas: [],
      instrument: "Unidad temática",
      instrumentDescription: "",
      regulation: "Decreto 1290 de 2009.",
      active,
      createdYear: 2020 + (index % 5),
      deactivatedYear: active ? null : 2023,
    } satisfies CurricularReference
  }),
)

// Autoincremental simulado, continúa después de los sembrados arriba.
let nextCurricularReferenceId = curricularReferencesDb.length + 1

export function takeNextCurricularReferenceId(): number {
  return nextCurricularReferenceId++
}

export function upsertCurricularReference(reference: CurricularReference) {
  const index = curricularReferencesDb.findIndex((item) => item.id === reference.id)

  if (index >= 0) {
    curricularReferencesDb[index] = reference
  } else {
    curricularReferencesDb.unshift(reference)
  }

  return reference
}

export function deleteCurricularReference(id: number) {
  const index = curricularReferencesDb.findIndex((item) => item.id === id)
  if (index >= 0) curricularReferencesDb.splice(index, 1)
}
