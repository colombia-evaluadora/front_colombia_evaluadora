import { api } from "@/lib/api-client"

interface GradeRow {
  id: number
  nombre: string
}
interface GradesRawResponse {
  rows: GradeRow[]
}

interface StudyPlanRow {
  asignatura: string
}
interface StudyPlanRawResponse {
  rows: StudyPlanRow[]
}

async function fetchGradeNames(academicPeriodId: number): Promise<GradeRow[]> {
  const raw: GradesRawResponse = await api.query(`/eval-col/grados/query/${academicPeriodId}`, {
    FILTRO: null,
    PAGE_INDEX: 0,
    PAGE_SIZE: 1000,
    SORTING_ID: null,
    SORTING_DESC: null,
  })
  return raw.rows ?? []
}

async function gradeUsesSubject(gradeId: number, nombreInterno: string): Promise<boolean> {
  const raw: StudyPlanRawResponse = await api.post(
    `/eval-col/grados/${gradeId}/plan-asignaturas/query`,
    {
      PAGE_INDEX: "0",
      PAGE_SIZE: "1000",
    }
  )
  return (raw.rows ?? []).some((row) => row.asignatura === nombreInterno)
}

/**
 * Quitar una asignatura del área es local hasta que se guarda — no hay
 * endpoint que diga "¿esta asignatura está en algún plan de estudio?" sin
 * recorrer grado por grado (`plan-asignaturas` es por grado). Se consulta
 * bajo demanda (al confirmar el quitar), no al abrir el diálogo.
 *
 * Devuelve el nombre del primer grado donde aparece, o `null` si no está en
 * uso en ninguno.
 */
export async function findGradeUsingSubject(
  academicPeriodId: number,
  nombreInterno: string
): Promise<string | null> {
  const grades = await fetchGradeNames(academicPeriodId)
  const results = await Promise.all(
    grades.map(async (grade) => ({
      grade,
      used: await gradeUsesSubject(grade.id, nombreInterno),
    }))
  )
  return results.find((r) => r.used)?.grade.nombre ?? null
}
