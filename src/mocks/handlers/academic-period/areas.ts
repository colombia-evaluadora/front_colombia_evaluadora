import { http, HttpResponse, delay } from "msw"

import { areasDb, nextAreaId, type AreaRecord } from "../../db/academic-period/areas"
import { subjectsDb } from "../../db/academic-period/subjects"
import { studyPlansDb } from "../../db/academic-period/study-plans"

interface AreaWriteBody {
  FK_PERIODO?: number
  FK_AREA_ASIGNATURA: number
  NOMBRE_INTERNO: string
  ABREVIACION: string
  ORDEN_REPORTES?: number
}

function toRawRow(row: AreaRecord, totalCount?: number) {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre_interno: row.nombreInterno,
    area_general_id: row.areaGeneralId,
    orden_reportes: row.ordenReportes,
    ...(totalCount != null ? { total_count: totalCount } : {}),
  }
}

function applyFilters(rows: AreaRecord[], nombreInterno: string | null) {
  if (!nombreInterno) return rows
  const needle = nombreInterno.toLowerCase()
  return rows.filter((row) => row.nombreInterno.toLowerCase().includes(needle))
}

export const areasHandlers = [
  http.post("/api/eval-col/areas/query", async ({ request }) => {
    await delay(250)
    const body = (await request.json()) as {
      FK_PERIODO: number
      NOMBRE_INTERNO: string | null
      PAGE_INDEX: number
      PAGE_SIZE: number
    }
    const scoped = areasDb.filter((row) => row.academicPeriodId === body.FK_PERIODO)
    const filtered = applyFilters(scoped, body.NOMBRE_INTERNO)
    const totalCount = filtered.length
    // `PAGE_INDEX` es 0-based (`fn_area_listar` real hace
    // `OFFSET page_index * page_size`, confirmado en la octava pasada de la
    // empalme — el front ya manda `pageIndex` directo, no `pageIndex + 1`).
    // Este mock todavía asumía 1-based: con `PAGE_INDEX: 0` el `start`
    // daba negativo y el `.slice()` siempre devolvía vacío, aunque el área
    // recién creada sí estuviera en `areasDb`.
    const start = body.PAGE_INDEX * body.PAGE_SIZE
    const rows = filtered
      .slice(start, start + body.PAGE_SIZE)
      .map((row) => toRawRow(row, totalCount))
    return HttpResponse.json({ rows })
  }),

  http.post("/api/eval-col/areas", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as AreaWriteBody
    const id = nextAreaId()
    const record: AreaRecord = {
      id,
      codigo: body.ABREVIACION,
      nombreInterno: body.NOMBRE_INTERNO,
      areaGeneralId: body.FK_AREA_ASIGNATURA,
      ordenReportes: body.ORDEN_REPORTES ?? 0,
      academicPeriodId: body.FK_PERIODO ?? 0,
    }
    areasDb.push(record)
    return HttpResponse.json({ rows: [{ fn_area_crear: id }] })
  }),

  http.put("/api/eval-col/areas/:id", async ({ request, params }) => {
    await delay(400)
    const body = (await request.json()) as Omit<AreaWriteBody, "FK_PERIODO">
    const index = areasDb.findIndex((row) => String(row.id) === String(params.id))
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Área no encontrada." },
        { status: 404 }
      )
    }
    areasDb[index] = {
      ...areasDb[index],
      codigo: body.ABREVIACION,
      nombreInterno: body.NOMBRE_INTERNO,
      areaGeneralId: body.FK_AREA_ASIGNATURA,
      ordenReportes: body.ORDEN_REPORTES ?? areasDb[index].ordenReportes,
    }
    return HttpResponse.json({ rows: [{ fn_area_actualizar: areasDb[index].id }] })
  }),

  // `fn_area_soft_delete` (id_query 37) — sin confirmar en ThunderClient
  // todavía; path/método según el contrato.
  http.put("/api/eval-col/areas/eliminar/:id", async ({ params }) => {
    await delay(300)
    const index = areasDb.findIndex((row) => String(row.id) === String(params.id))
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Área no encontrada." },
        { status: 404 }
      )
    }
    const [removed] = areasDb.splice(index, 1)
    // Cascada: asignaturas del área y los ítems de plan de estudio que las
    // referencian por nombre.
    const removedSubjectNames = new Set<string>()
    for (let i = subjectsDb.length - 1; i >= 0; i--) {
      if (subjectsDb[i].areaId === removed.id) {
        removedSubjectNames.add(subjectsDb[i].nombreInterno)
        subjectsDb.splice(i, 1)
      }
    }
    for (let i = studyPlansDb.length - 1; i >= 0; i--) {
      if (removedSubjectNames.has(studyPlansDb[i].asignatura)) {
        studyPlansDb.splice(i, 1)
      }
    }
    return HttpResponse.json({ rows: [{ fn_area_soft_delete: removed.id }] })
  }),
]
