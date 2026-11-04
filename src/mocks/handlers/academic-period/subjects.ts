import { http, HttpResponse, delay } from "msw"

import {
  subjectsDb,
  nextSubjectId,
  type SubjectRecord,
} from "../../db/academic-period/subjects"
import { areasDb } from "../../db/academic-period/areas"
import { studyPlansDb } from "../../db/academic-period/study-plans"
import { campusSpecialtiesDb, SPECIALTY_CATALOG } from "../../db/campus-details"

// Estructura JSONB confirmada de `fn_subject_guardar_bulk` — camelCase,
// `asignaturaGeneral` va como id, pero `especialidad` va como NOMBRE (texto),
// no como id (confirmado leyendo la función real: resuelve por
// TESPECIALIDAD.NOMBRE / fn_enfasis_resolver por nombre — ver
// to-asignaturas-payload.ts). Reemplazo total: no hay alta/edición/baja de
// asignatura individual.
interface AsignaturaBulkItem {
  nombreInterno: string
  abreviacion: string
  asignaturaGeneral: number
  especialidad: string | null
  color: string | null
  ordenReportes: number
}

// La especialidad (por nombre) es un ítem del catálogo de la sede (Regla 86), como
// `fn_enfasis_de_nombre_interno`. El mock no distingue la sede: busca en todos.
function enfasisLabel(item: (typeof campusSpecialtiesDb)[number]): string {
  return item.ownName ?? SPECIALTY_CATALOG.find((c) => c.id === item.specialtyId)?.nombre ?? ""
}

function resolveEnfasisId(nombre: string | null): number | null {
  if (!nombre) return null
  return campusSpecialtiesDb.find((item) => enfasisLabel(item).toLowerCase() === nombre.toLowerCase())?.id ?? null
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
  // `fn_subject_crear` (id_query 39): alta desde "Crear asignatura" del plan.
  // Nombre y abreviación únicos en el período (Regla 62).
  http.post("/api/eval-col/areas/:areaId/asignaturas", async ({ params, request }) => {
    await delay(300)
    const areaId = Number(params.areaId)
    const body = (await request.json()) as {
      FK_AREA_ASIGNATURA: number
      NOMBRE_INTERNO: string
      ABREVIACION: string
      ORDEN_REPORTES: number
      COLOR?: string
      FK_ENFASIS?: number
    }
    const periodId = areasDb.find((a) => a.id === areaId)?.academicPeriodId
    const periodAreaIds = new Set(areasDb.filter((a) => a.academicPeriodId === periodId).map((a) => a.id))
    const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
    const siblings = subjectsDb.filter((s) => periodAreaIds.has(s.areaId))
    if (siblings.some((s) => same(s.nombreInterno, body.NOMBRE_INTERNO))) {
      return HttpResponse.json(
        { status: "error", message: `Ya existe una asignatura llamada ${body.NOMBRE_INTERNO} en el período.` },
        { status: 409 }
      )
    }
    if (siblings.some((s) => same(s.abreviacion, body.ABREVIACION))) {
      return HttpResponse.json(
        { status: "error", message: `Ya existe una asignatura con la abreviación ${body.ABREVIACION} en el período.` },
        { status: 409 }
      )
    }
    const id = nextSubjectId()
    subjectsDb.push({
      id,
      nombreInterno: body.NOMBRE_INTERNO,
      abreviacion: body.ABREVIACION,
      asignaturaGeneralId: body.FK_AREA_ASIGNATURA,
      enfasisId: body.FK_ENFASIS ?? null,
      color: body.COLOR ?? null,
      ordenReportes: body.ORDEN_REPORTES,
      areaId,
    })
    return HttpResponse.json({ rows: [{ fn_subject_crear: id }] })
  }),

  // Catálogo de asignaturas del período (`fn_asignatura_listar`), lo usan el
  // selector de obligatorias de Criterios de promoción y otros. Sin este
  // handler la request salía al back real, que respondía 401 al JWT de mock y
  // el interceptor cerraba la sesión.
  http.post("/api/eval-col/areas/asignaturas", async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as {
      FK_PERIODO: number
      FILTRO: string | null
      PAGE_INDEX: number
      PAGE_SIZE: number
    }
    const areaIds = new Set(
      areasDb.filter((a) => a.academicPeriodId === body.FK_PERIODO).map((a) => a.id)
    )
    const needle = body.FILTRO?.toLowerCase()
    const scoped = subjectsDb
      .filter((s) => areaIds.has(s.areaId))
      .filter((s) => !needle || s.nombreInterno.toLowerCase().includes(needle))
    const start = body.PAGE_INDEX * body.PAGE_SIZE
    // Columnas de `fn_subject_periodo_listar`: las leen `use-subjects.ts` y
    // `use-subject-details-query.ts`.
    const rows = scoped.slice(start, start + body.PAGE_SIZE).map((s) => ({
      id: s.id,
      codigo: s.abreviacion,
      nombre_interno: s.nombreInterno,
      area_id: s.areaId,
      area_nombre: areasDb.find((a) => a.id === s.areaId)?.nombreInterno ?? "",
      color: s.color,
      orden_reportes: s.ordenReportes,
      enfasis_nombre: ((item) => (item ? enfasisLabel(item) : null))(campusSpecialtiesDb.find((e) => e.id === s.enfasisId)),
      asignatura_general_id: s.asignaturaGeneralId,
      total_count: scoped.length,
    }))
    return HttpResponse.json({ rows })
  }),

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
        enfasisId: resolveEnfasisId(item.especialidad),
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
