import { http, HttpResponse, delay } from "msw"
import { gradeGroupsDb } from "@/mocks/db/academic-period/grade-groups"

import type { GradeGroupRecord } from "@/features/establishment/academic-period/api/types/grade-group"

interface GradeGroupWriteBody {
  FK_GRADO?: number
  NOMBRE: string
  FK_MODELO_PEDAGOGICO: number | null
  CAPACIDAD?: number
  FK_FUNCIONARIO: number | null
}

function toRawRow(row: GradeGroupRecord, totalCount?: number) {
  return {
    id: row.id,
    codigo: row.codigo,
    jornada: row.jornada,
    jornada_name: row.jornadaName ?? row.jornada,
    director_id: null,
    director_name: row.director || null,
    metodologia: row.metodologia ?? null,
    metodologia_name: row.metodologiaName ?? row.metodologia ?? null,
    cupo: row.cupo ?? 0,
    ...(totalCount != null ? { total_count: totalCount } : {}),
  }
}

function applyFilters(rows: GradeGroupRecord[], filtro: string | null) {
  if (!filtro) return rows
  const needle = filtro.toLowerCase()
  return rows.filter((row) => row.codigo.toLowerCase().includes(needle))
}

export const gradeGroupsHandlers = [
  // `fn_grupo_listar` (id_query 65) — path/params reales (ver
  // `use-grade-groups.ts`), no el `/api/grade-groups/query` viejo. `/query`
  // porque el POST sin sufijo en esta misma ruta ya es la creación de grupo.
  http.post("/api/eval-col/grados/:gradeId/grupos/query", async ({ params, request }) => {
    await delay(250)
    const gradeId = Number(params.gradeId)
    const body = (await request.json()) as {
      FILTRO?: string
      PAGE_INDEX?: string | number
      PAGE_SIZE?: string | number
    }
    const filtro = body.FILTRO ?? null
    const pageIndex = Number(body.PAGE_INDEX ?? 0)
    const pageSize = Number(body.PAGE_SIZE ?? 10)

    const scoped = gradeGroupsDb.filter((row) => row.gradeId === gradeId)
    const filtered = applyFilters(scoped, filtro)
    const totalCount = filtered.length
    const start = pageIndex * pageSize
    const rows = filtered.slice(start, start + pageSize).map((row) => toRawRow(row, totalCount))
    return HttpResponse.json({ rows })
  }),

  http.post("/api/eval-col/grados/:gradeId/grupos", async ({ params, request }) => {
    await delay(400)
    const gradeId = Number(params.gradeId)
    const body = (await request.json()) as GradeGroupWriteBody
    const id = gradeGroupsDb.reduce((max, row) => Math.max(max, row.id), 0) + 1
    const record: GradeGroupRecord = {
      id,
      codigo: body.NOMBRE,
      jornada: "",
      director: "",
      metodologia: body.FK_MODELO_PEDAGOGICO != null ? String(body.FK_MODELO_PEDAGOGICO) : undefined,
      cupo: body.CAPACIDAD,
      gradeId: body.FK_GRADO ?? gradeId,
    }
    gradeGroupsDb.push(record)
    return HttpResponse.json({ rows: [{ fn_grupo_crear: id }] })
  }),

  http.put("/api/eval-col/grupos/:id", async ({ params, request }) => {
    await delay(400)
    const index = gradeGroupsDb.findIndex((row) => String(row.id) === String(params.id))
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Grupo no encontrado." },
        { status: 404 }
      )
    }
    const body = (await request.json()) as GradeGroupWriteBody
    gradeGroupsDb[index] = {
      ...gradeGroupsDb[index],
      codigo: body.NOMBRE,
      metodologia: body.FK_MODELO_PEDAGOGICO != null ? String(body.FK_MODELO_PEDAGOGICO) : undefined,
      cupo: body.CAPACIDAD,
    }
    return HttpResponse.json({ status: "ok", message: "Grupo actualizado." })
  }),

  http.put("/api/eval-col/grupos/:id/eliminar", async ({ params }) => {
    await delay(300)
    const index = gradeGroupsDb.findIndex((row) => String(row.id) === String(params.id))
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Grupo no encontrado." },
        { status: 404 }
      )
    }
    gradeGroupsDb.splice(index, 1)
    return HttpResponse.json({ status: "ok", message: "Grupo eliminado." })
  }),
]
