import { http, HttpResponse, delay } from "msw"
import { gradeGroupsDb } from "@/mocks/db/academic-period/grade-groups"
import { gradesDb } from "@/mocks/db/academic-period/grades"
import { academicPeriodConfigsDb } from "@/mocks/db/academic-period/academic-periods"
import { metodologiasDb } from "@/mocks/db/academic-period/metodologias"
import { jornadasDb } from "@/mocks/db/academic-period/jornadas"
import { funcionariosDb } from "@/mocks/db/academic-period/funcionarios"

import type { GradeGroupRecord } from "@/features/establishment/academic-period/api/types/grade-group"

// FK_MODELO_PEDAGOGICO llega como pk de MODELO_PEDAGOGICO (índice + 1, como lo
// arma `select-catalog.ts`); se guarda el VALOR para mostrarlo.
function metodologiaByPk(pk: number | null | undefined): string | undefined {
  return pk != null ? metodologiasDb[pk - 1]?.key : undefined
}

// El grupo hereda la jornada del período de su grado.
function jornadaOfGrade(gradeId: number): string {
  const grade = gradesDb.find((g) => g.id === gradeId)
  const config = academicPeriodConfigsDb.find((c) => c.academicPeriodId === grade?.academicPeriodId)
  return jornadasDb.find((j) => j.id === config?.jornadaId)?.name ?? ""
}

// Reglas 55 y 56 tal como las aplicaría `fn_grupo_crear/actualizar`.
function validate(body: GradeGroupWriteBody, gradeId: number, excludeId: number | null): string | null {
  const nombre = body.NOMBRE.trim()
  if (gradeGroupsDb.some((g) => g.gradeId === gradeId && g.id !== excludeId && g.codigo.toLowerCase() === nombre.toLowerCase())) {
    return `El grupo ${nombre} ya existe en el grado.`
  }
  if (body.CAPACIDAD == null || body.CAPACIDAD < 1 || body.CAPACIDAD > 99) return "El Cupo debe ser de 1 a 99."
  return null
}

const conflict = (message: string) => HttpResponse.json({ status: "error", message }, { status: 409 })

interface GradeGroupWriteBody {
  FK_GRADO?: number
  NOMBRE: string
  FK_MODELO_PEDAGOGICO: number | null
  CAPACIDAD?: number
  FK_FUNCIONARIO: number | null
  DICTA_TODAS?: "S" | "N"
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
    dicta_todas: row.dictaTodas ? "S" : "N",
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
    const rows = (pageSize > 0 ? filtered.slice(start, start + pageSize) : filtered).map((row) =>
      toRawRow(row, totalCount),
    )
    return HttpResponse.json({ rows })
  }),

  http.post("/api/eval-col/grados/:gradeId/grupos", async ({ params, request }) => {
    await delay(400)
    const gradeId = Number(params.gradeId)
    const body = (await request.json()) as GradeGroupWriteBody
    const error = validate(body, gradeId, null)
    if (error) return conflict(error)
    const id = gradeGroupsDb.reduce((max, row) => Math.max(max, row.id), 0) + 1
    const jornada = jornadaOfGrade(gradeId)
    const record: GradeGroupRecord = {
      id,
      codigo: body.NOMBRE.trim(),
      jornada,
      jornadaName: jornada,
      directorId: body.FK_FUNCIONARIO ?? null,
      metodologia: metodologiaByPk(body.FK_MODELO_PEDAGOGICO),
      metodologiaName: metodologiaByPk(body.FK_MODELO_PEDAGOGICO),
      cupo: body.CAPACIDAD,
      dictaTodas: body.DICTA_TODAS === "S",
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
    const error = validate(body, gradeGroupsDb[index].gradeId, gradeGroupsDb[index].id)
    if (error) return conflict(error)
    gradeGroupsDb[index] = {
      ...gradeGroupsDb[index],
      codigo: body.NOMBRE.trim(),
      // El Responsable de grupo es opcional y se puede quitar.
      directorId: body.FK_FUNCIONARIO ?? null,
      metodologia: metodologiaByPk(body.FK_MODELO_PEDAGOGICO),
      metodologiaName: metodologiaByPk(body.FK_MODELO_PEDAGOGICO),
      cupo: body.CAPACIDAD,
      dictaTodas: body.DICTA_TODAS === "S",
    }
    return HttpResponse.json({ status: "ok", message: "Grupo actualizado." })
  }),

  // El primer grupo de cada grado simula tener matrículas y registros (no se elimina).
  http.get("/api/eval-col/grupos/:id/dependencias", async ({ params }) => {
    await delay(200)
    const group = gradeGroupsDb.find((row) => String(row.id) === String(params.id))
    const blocked = group?.codigo.endsWith("A") ?? false
    return HttpResponse.json([
      blocked
        ? { matriculas: 25, asignaciones: 4, horarios: 0, actividades: 32, clases_asistencia: 48, calificaciones: 0 }
        : { matriculas: 0, asignaciones: 0, horarios: 0, actividades: 0, clases_asistencia: 0, calificaciones: 0 },
    ])
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
