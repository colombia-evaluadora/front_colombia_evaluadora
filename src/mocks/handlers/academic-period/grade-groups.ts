import { http, HttpResponse, delay } from "msw"
import { gradeGroupsDb } from "@/mocks/db/academic-period/grade-groups"
import { GROUPS } from "@/mocks/db/reservations"
import { jornadasDb } from "@/mocks/db/academic-period/jornadas"
import { funcionariosDb } from "@/mocks/db/academic-period/funcionarios"

import type { GradeGroupRecord } from "@/features/establishment/academic-period/api/types/grade-group"

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function mixHash(value: number): number {
  let x = value
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = x ^ (x >>> 16)
  return Math.abs(x)
}

function generateFallbackGroups(gradeId: number): GradeGroupRecord[] {
  const seed = mixHash(hashString(`grupos-${gradeId}`))
  const count = 1 + (seed % GROUPS.length)
  const offset = seed % GROUPS.length
  const codigos = Array.from({ length: count }, (_, i) => GROUPS[(offset + i) % GROUPS.length]).sort()

  return codigos.map((codigo) => {
    const jornada = jornadasDb[mixHash(hashString(`grupo-jornada-${gradeId}-${codigo}`)) % jornadasDb.length]
    return {
      id: mixHash(hashString(`grupo-${gradeId}-${codigo}`)) % 1000000,
      codigo,
      jornada: jornada.name,
      jornadaName: jornada.name,
      directorId: null,
      metodologia: undefined,
      metodologiaName: undefined,
      cupo: 30,
      gradeId,
    }
  })
}

interface GradeGroupWriteBody {
  FK_GRADO?: number
  NOMBRE: string
  FK_MODELO_PEDAGOGICO: number | null
  CAPACIDAD?: number
  FK_FUNCIONARIO: number | null
}

function toRawRow(row: GradeGroupRecord, totalCount?: number) {
  const director = funcionariosDb.find((f) => f.id === row.directorId)
  return {
    id: row.id,
    codigo: row.codigo,
    jornada: row.jornada,
    jornada_name: row.jornadaName ?? row.jornada,
    director_id: row.directorId,
    director_name: director?.nombre ?? null,
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

    const created = gradeGroupsDb.filter((row) => row.gradeId === gradeId)
    const scoped = created.length > 0 ? created : generateFallbackGroups(gradeId)
    const filtered = applyFilters(scoped, filtro)
    const totalCount = filtered.length
    const start = pageIndex * pageSize
    const rows = (pageSize > 0 ? filtered.slice(start, start + pageSize) : filtered).map((row) =>
      toRawRow(row, totalCount),
    )
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
      directorId: body.FK_FUNCIONARIO ?? null,
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
      directorId: body.FK_FUNCIONARIO ?? gradeGroupsDb[index].directorId,
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
