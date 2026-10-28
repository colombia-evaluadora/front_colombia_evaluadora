import type { GradeRecord } from "@/features/establishment/academic-period/api/types/grade"
import { teachingLevelsDb } from "@/mocks/db/academic-period/rating-scales"
import { jornadasDb } from "@/mocks/db/academic-period/jornadas"

export function gradeLevelName(id: number): string {
  return teachingLevelsDb.find((level) => level.id === id)?.nombre ?? ""
}

// Catálogo GRADOS (Lista de Valores): VALOR "0".."11", pk = índice + 1, como
// lo sirve `select-catalog.ts`.
export const GRADE_NAMES = [
  "Transición",
  "Primero",
  "Segundo",
  "Tercero",
  "Cuarto",
  "Quinto",
  "Sexto",
  "Séptimo",
  "Octavo",
  "Noveno",
  "Décimo",
  "Undécimo",
]

export const gradePk = (valor: string) => Number(valor) + 1
export const gradeNameByValor = (valor: string | undefined) =>
  valor != null && valor !== "" ? (GRADE_NAMES[Number(valor)] ?? valor) : undefined
export const gradeValorByPk = (pk: number | null | undefined) =>
  pk != null && GRADE_NAMES[pk - 1] != null ? String(pk - 1) : undefined

const jornadas = (...ids: number[]) =>
  jornadasDb.filter((j) => ids.includes(j.id)).map((j) => ({ id: j.id, name: j.name }))

function seed(
  id: number,
  valor: number,
  teachingLevelId: number,
  siguiente: number | null,
  jornadaIds: number[],
): GradeRecord {
  return {
    id,
    nombre: GRADE_NAMES[valor],
    grado: String(valor),
    teachingLevelId,
    teachingLevelName: gradeLevelName(teachingLevelId),
    tieneGradoSiguiente: siguiente != null,
    gradoSiguiente: siguiente != null ? String(siguiente) : undefined,
    gradoSiguienteName: siguiente != null ? GRADE_NAMES[siguiente] : undefined,
    jornadasContinuidad: jornadas(...jornadaIds),
    personalizarHorario: false,
    academicPeriodId: 1,
  }
}

// Grados del período 1 del prototipo: 6° a 8° de Secundaria y 11° de Media.
export const gradesDb: GradeRecord[] = [
  seed(1, 6, 3, 7, [1, 2]),
  seed(2, 7, 3, 8, [1]),
  seed(3, 8, 3, 9, [2]),
  seed(4, 11, 4, null, []),
]
