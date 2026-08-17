import { http, HttpResponse, delay } from "msw"
import { gradesDb, gradeLevelName } from "@/mocks/db/academic-period/grades"

import type {
  ExportFormat,
  ExportResult,
  GradeRecord,
  GradesQueryRequest,
} from "@/features/establishment/academic-period/api/types/grade"

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

interface GradeWriteBody {
  FK_PERIODO?: number
  FK_NIVEL: number
  NOMBRE: string
  FK_GRADO_SIGUIENTE: number | null
  TIENE_GRADO_SIGUIENTE?: boolean
}

function toRawRow(row: GradeRecord, totalCount?: number) {
  return {
    id: row.id,
    nombre: row.nombre,
    grado: row.grado,
    teaching_level_id: row.teachingLevelId,
    teaching_level_name: row.teachingLevelName,
    grado_siguiente: row.gradoSiguiente ?? null,
    grado_siguiente_name: row.gradoSiguienteName ?? null,
    tiene_grado_siguiente: row.tieneGradoSiguiente ?? false,
    ...(totalCount != null ? { total_count: totalCount } : {}),
  }
}

function applyFilters(rows: GradeRecord[], filtro: string | null) {
  if (!filtro) return rows
  const needle = filtro.toLowerCase()
  return rows.filter((row) => row.nombre.toLowerCase().includes(needle))
}

export const gradesHandlers = [
  // `fn_grado_listar` (id_query 60) — el path/params reales (ver
  // `use-grades.ts`), no el `/api/grades/query` viejo que este mock tenía
  // antes. Sin esto la pantalla de Grados caía en el mismo bug que Criterio
  // de promoción: la request pasaba de largo al backend real y el 401
  // deslogueaba a toda la app.
  http.get("/api/eval-col/grados", async ({ request }) => {
    await delay(250)
    const url = new URL(request.url)
    const fkPeriodo = Number(url.searchParams.get("fkPeriodo"))
    const filtro = url.searchParams.get("filtro")
    const pageIndex = Number(url.searchParams.get("pageIndex") ?? 0)
    const pageSize = Number(url.searchParams.get("pageSize") ?? 10)

    const scoped = gradesDb.filter((row) => row.academicPeriodId === fkPeriodo)
    const filtered = applyFilters(scoped, filtro)
    const totalCount = filtered.length
    const start = pageIndex * pageSize
    const rows = filtered.slice(start, start + pageSize).map((row) => toRawRow(row, totalCount))
    return HttpResponse.json({ rows })
  }),

  http.post("/api/eval-col/grados", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as GradeWriteBody
    const id = gradesDb.reduce((max, g) => Math.max(max, g.id), 0) + 1
    const newGrade: GradeRecord = {
      id,
      nombre: body.NOMBRE,
      grado: body.NOMBRE,
      teachingLevelId: body.FK_NIVEL,
      teachingLevelName: gradeLevelName(body.FK_NIVEL),
      gradoSiguiente: body.FK_GRADO_SIGUIENTE != null ? String(body.FK_GRADO_SIGUIENTE) : undefined,
      tieneGradoSiguiente: body.FK_GRADO_SIGUIENTE != null,
      academicPeriodId: body.FK_PERIODO ?? 0,
    }
    gradesDb.push(newGrade)
    return HttpResponse.json({ rows: [{ fn_grado_crear: id }] })
  }),

  http.put("/api/eval-col/grados/:id", async ({ params, request }) => {
    await delay(400)
    const index = gradesDb.findIndex((g) => String(g.id) === String(params.id))
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Grado no encontrado." },
        { status: 404 }
      )
    }
    const body = (await request.json()) as GradeWriteBody
    gradesDb[index] = {
      ...gradesDb[index],
      nombre: body.NOMBRE,
      teachingLevelId: body.FK_NIVEL,
      teachingLevelName: gradeLevelName(body.FK_NIVEL),
      gradoSiguiente: body.FK_GRADO_SIGUIENTE != null ? String(body.FK_GRADO_SIGUIENTE) : undefined,
      tieneGradoSiguiente: body.TIENE_GRADO_SIGUIENTE ?? gradesDb[index].tieneGradoSiguiente,
    }
    return HttpResponse.json({ status: "ok", message: "Grado actualizado." })
  }),

  http.put("/api/eval-col/grados/:id/eliminar", async ({ params }) => {
    await delay(300)
    const index = gradesDb.findIndex((g) => String(g.id) === String(params.id))
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Grado no encontrado." },
        { status: 404 }
      )
    }
    gradesDb.splice(index, 1)
    return HttpResponse.json({ status: "ok", message: "Grado eliminado." })
  }),

  // Borrado en lote por ids (atómico, una sola request).
  http.put("/api/eval-col/grados/eliminacion-masiva", async ({ request }) => {
    await delay(300)
    const { IDS } = (await request.json()) as { IDS: number[] }
    const set = new Set(IDS)
    for (let i = gradesDb.length - 1; i >= 0; i--) {
      if (set.has(gradesDb[i].id)) gradesDb.splice(i, 1)
    }
    return HttpResponse.json({ status: "ok", message: "Grados eliminados." })
  }),

  // Sin endpoint real en el contrato — exportar sigue siendo mock-only.
  http.post("/api/grades/export", async ({ request }) => {
    await delay(600)
    const { ids, format } = (await request.json()) as {
      ids: number[]
      format: ExportFormat
    }
    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${ids.length} grado(s) exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/grades/export-all", async ({ request }) => {
    await delay(600)
    const { filters, format } = (await request.json()) as {
      filters: GradesQueryRequest["filters"]
      format: ExportFormat
    }
    const needle = filters.nombre?.toLowerCase()
    const count = gradesDb.filter(
      (row) => !needle || row.nombre.toLowerCase().includes(needle)
    ).length
    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} grado(s) exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),
]
