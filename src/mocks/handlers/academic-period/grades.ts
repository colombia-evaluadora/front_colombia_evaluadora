import { http, HttpResponse, delay } from "msw"
import {
  gradeLevelName,
  gradeNameByValor,
  gradesDb,
  gradeValorByPk,
} from "@/mocks/db/academic-period/grades"
import { gradeGroupsDb } from "@/mocks/db/academic-period/grade-groups"
import { jornadasDb } from "@/mocks/db/academic-period/jornadas"
import { fromRecesosRows, toRecesosBody, type RecesoRow } from "@/features/establishment/academic-period/utils/recesos"

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

// Body de `fn_grado_crear`/`fn_grado_actualizar` (V79): NOMBRE es el VALOR
// del catálogo GRADOS y FK_GRADO_SIGUIENTE su pk.
interface GradeWriteBody {
  FK_PERIODO?: number
  FK_NIVEL: number
  NOMBRE: string
  FK_GRADO_SIGUIENTE: number | null
  TIENE_GRADO_SIGUIENTE?: boolean
  JORNADAS_CONTINUIDAD?: number[]
  PERSONALIZAR_HORARIO?: "S" | "N"
  HORA_INICIO?: string | null
  HORA_FIN?: string | null
  BLOQUES?: number | null
  RECESOS?: RecesoRow[]
}

function toRawRow(row: GradeRecord, totalCount?: number) {
  const groups = gradeGroupsDb.filter((g) => g.gradeId === row.id)
  return {
    id: row.id,
    nombre: row.nombre,
    grado: row.grado,
    teaching_level_id: row.teachingLevelId,
    teaching_level_name: row.teachingLevelName,
    grado_siguiente: row.gradoSiguiente ?? null,
    grado_siguiente_name: row.gradoSiguienteName ?? null,
    tiene_grado_siguiente: row.tieneGradoSiguiente ?? false,
    jornadas_continuidad: row.jornadasContinuidad ?? [],
    personalizar_horario: row.personalizarHorario ? "S" : "N",
    schedule_start_time: row.horaInicio ?? null,
    schedule_end_time: row.horaFin ?? null,
    blocks_count: row.bloques ?? null,
    recesos: toRecesosBody(row.recesos),
    groups_count: groups.length,
    total_capacity: groups.reduce((sum, g) => sum + (g.cupo ?? 0), 0),
    ...(totalCount != null ? { total_count: totalCount } : {}),
  }
}

function applyFilters(rows: GradeRecord[], filtro: string | null) {
  if (!filtro) return rows
  const needle = filtro.toLowerCase()
  return rows.filter((row) => row.nombre.toLowerCase().includes(needle))
}

// Reglas 53, 54 y 88 tal como las aplicaría `fn_grado_crear/actualizar`.
function validate(body: GradeWriteBody, academicPeriodId: number, excludeId: number | null): string | null {
  const nombre = gradeNameByValor(body.NOMBRE) ?? body.NOMBRE
  const repeated = gradesDb.some(
    (g) => g.academicPeriodId === academicPeriodId && g.id !== excludeId && g.grado === body.NOMBRE
  )
  if (repeated) return `El grado ${nombre} ya existe en este período académico.`
  const siguiente = gradeValorByPk(body.FK_GRADO_SIGUIENTE)
  if (siguiente != null && siguiente === body.NOMBRE) return "El Grado siguiente no puede ser el mismo grado."
  if (siguiente != null && !(body.JORNADAS_CONTINUIDAD ?? []).length) {
    return "Elija al menos una jornada de continuidad."
  }
  return null
}

function fromBody(body: GradeWriteBody): Partial<GradeRecord> {
  const siguiente = gradeValorByPk(body.FK_GRADO_SIGUIENTE)
  const personalizar = body.PERSONALIZAR_HORARIO === "S"
  return {
    nombre: gradeNameByValor(body.NOMBRE) ?? body.NOMBRE,
    grado: body.NOMBRE,
    teachingLevelId: body.FK_NIVEL,
    teachingLevelName: gradeLevelName(body.FK_NIVEL),
    tieneGradoSiguiente: siguiente != null,
    gradoSiguiente: siguiente,
    gradoSiguienteName: gradeNameByValor(siguiente),
    jornadasContinuidad: jornadasDb
      .filter((j) => (body.JORNADAS_CONTINUIDAD ?? []).includes(j.id))
      .map((j) => ({ id: j.id, name: j.name })),
    personalizarHorario: personalizar,
    horaInicio: personalizar ? (body.HORA_INICIO ?? null) : null,
    horaFin: personalizar ? (body.HORA_FIN ?? null) : null,
    bloques: personalizar ? (body.BLOQUES ?? null) : null,
    recesos: personalizar ? fromRecesosRows(body.RECESOS) : [],
  }
}

const conflict = (message: string) => HttpResponse.json({ status: "error", message }, { status: 409 })

export const gradesHandlers = [
  // `fn_grado_listar` (id_query 60): POST con el período en el path, como lo
  // llama `use-grades.ts`. Sin él la request salía al back real y el 401
  // cerraba la sesión.
  http.post("/api/eval-col/grados/query/:academicPeriodId", async ({ params, request }) => {
    await delay(250)
    const body = (await request.json()) as { FILTRO: string | null; PAGE_INDEX: number; PAGE_SIZE: number }
    const scoped = gradesDb.filter((row) => row.academicPeriodId === Number(params.academicPeriodId))
    const filtered = applyFilters(scoped, body.FILTRO)
    const start = body.PAGE_INDEX * body.PAGE_SIZE
    const rows = filtered.slice(start, start + body.PAGE_SIZE).map((row) => toRawRow(row, filtered.length))
    return HttpResponse.json({ rows })
  }),

  // Rótulos del Referente del grado: sin referente, el front usa "Asignatura".
  http.get("/api/eval-col/grados/:id/rotulos-referente", async () => {
    await delay(100)
    return HttpResponse.json({ rows: [] })
  }),

  http.post("/api/eval-col/grados", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as GradeWriteBody
    const academicPeriodId = body.FK_PERIODO ?? 0
    const error = validate(body, academicPeriodId, null)
    if (error) return conflict(error)
    const id = gradesDb.reduce((max, g) => Math.max(max, g.id), 0) + 1
    gradesDb.push({ id, ...fromBody(body), academicPeriodId } as GradeRecord)
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
    const error = validate(body, gradesDb[index].academicPeriodId, gradesDb[index].id)
    if (error) return conflict(error)
    gradesDb[index] = { ...gradesDb[index], ...fromBody(body) }
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
