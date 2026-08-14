import { http, HttpResponse, delay } from "msw"

import {
  subjectsDb,
  nextSubjectId,
  type SubjectRecord,
} from "../../db/academic-period/subjects"
import { studyPlansDb } from "../../db/academic-period/study-plans"

// Estructura JSONB confirmada de `fn_subject_guardar_bulk` — camelCase,
// `asignaturaGeneral`/`especialidad` como id. Reemplazo total: no hay
// alta/edición/baja de asignatura individual.
interface AsignaturaBulkItem {
  nombreInterno: string
  abreviacion: string
  asignaturaGeneral: number
  especialidad: number | null
  color: string | null
  ordenReportes: number
}

function toRawRow(row: SubjectRecord) {
  return {
    id: row.id,
    abreviacion: row.abreviacion,
    nombre_interno: row.nombreInterno,
    asignatura_general_id: row.asignaturaGeneralId,
    enfasis_id: row.enfasisId,
    color: row.color,
    orden_reportes: row.ordenReportes,
  }
}

export const subjectsHandlers = [
  http.get("/api/eval-col/areas/:areaId/asignaturas", async ({ params }) => {
    await delay(200)
    const areaId = Number(params.areaId)
    const rows = subjectsDb
      .filter((row) => row.areaId === areaId)
      .map((row) => toRawRow(row))
    return HttpResponse.json({ rows })
  }),

  // `fn_subject_guardar_bulk` (id_query 44) — reemplaza TODAS las asignaturas
  // del área por las que vengan en el array (borra las que ya no estén).
  http.put("/api/eval-col/areas/:areaId/asignaturas", async ({ request, params }) => {
    await delay(400)
    const body = (await request.json()) as { ASIGNATURAS: AsignaturaBulkItem[] }
    const areaId = Number(params.areaId)

    const removedNames = new Set(
      subjectsDb.filter((row) => row.areaId === areaId).map((row) => row.nombreInterno)
    )
    for (let i = subjectsDb.length - 1; i >= 0; i--) {
      if (subjectsDb[i].areaId === areaId) subjectsDb.splice(i, 1)
    }

    for (const item of body.ASIGNATURAS ?? []) {
      subjectsDb.push({
        id: nextSubjectId(),
        nombreInterno: item.nombreInterno,
        abreviacion: item.abreviacion,
        asignaturaGeneralId: item.asignaturaGeneral,
        enfasisId: item.especialidad,
        color: item.color,
        ordenReportes: item.ordenReportes,
        areaId,
      })
      removedNames.delete(item.nombreInterno)
    }

    // Cascada: los ítems de plan de estudio de asignaturas que ya no están.
    for (let i = studyPlansDb.length - 1; i >= 0; i--) {
      if (removedNames.has(studyPlansDb[i].asignatura)) {
        studyPlansDb.splice(i, 1)
      }
    }

    return HttpResponse.json({ rows: [{ fn_subject_guardar_bulk: areaId }] })
  }),
]
