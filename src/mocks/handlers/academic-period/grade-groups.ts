import { http, HttpResponse, delay } from "msw"
import { gradeGroupsDb } from "@/mocks/db/academic-period/grade-groups"

import type {
  GradeGroup,
  GradeGroupsQueryRequest,
  GradeGroupsQueryResponse,
  CreateGradeGroupRequest,
  UpdateGradeGroupRequest,
} from "@/features/establishment/academic-period/api/types/grade-group"

function applyFilters(
  rows: GradeGroup[],
  filters: GradeGroupsQueryRequest["filters"]
): GradeGroup[] {
  return rows.filter((row) => {
    if (
      filters.codigo &&
      !row.codigo.toLowerCase().includes(filters.codigo.toLowerCase())
    ) {
      return false
    }
    if (
      filters.jornada &&
      !row.jornada.toLowerCase().includes(filters.jornada.toLowerCase())
    ) {
      return false
    }
    if (
      filters.director &&
      !row.director.toLowerCase().includes(filters.director.toLowerCase())
    ) {
      return false
    }
    return true
  })
}

function applySorting(
  rows: GradeGroup[],
  sorting: GradeGroupsQueryRequest["sorting"]
): GradeGroup[] {
  if (!sorting.length) return rows
  const [{ id, desc }] = sorting
  const sorted = [...rows].sort((a, b) => {
    const av = String(a[id as keyof GradeGroup])
    const bv = String(b[id as keyof GradeGroup])
    return av.localeCompare(bv)
  })
  return desc ? sorted.reverse() : sorted
}

export const gradeGroupsHandlers = [
  http.post("/api/grade-groups/query", async ({ request }) => {
    await delay(250)

    const body = (await request.json()) as GradeGroupsQueryRequest
    const { filters, sorting, pageIndex, pageSize, gradeId } = body

    const scoped =
      gradeId == null
        ? gradeGroupsDb
        : gradeGroupsDb.filter((row) => row.gradeId === gradeId)

    const filtered = applySorting(applyFilters(scoped, filters), sorting)

    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize
    // El backend resuelve jornada/metodología (TLISTA_VALOR.NOMBRE); el mock los
    // espeja de sus valores.
    const rows = filtered
      .slice(start, start + pageSize)
      .map((row) => ({
        ...row,
        jornadaName: row.jornada,
        metodologiaName: row.metodologia,
      }))

    return HttpResponse.json<GradeGroupsQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  http.post("/api/grade-groups", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as CreateGradeGroupRequest
    const nextId =
      gradeGroupsDb.reduce((max, row) => Math.max(max, row.id), 0) + 1
    const record = { ...body, id: nextId, gradeId: body.gradeId ?? 0 }
    gradeGroupsDb.push(record)
    return HttpResponse.json(record, { status: 201 })
  }),

  http.patch("/api/grade-groups/:codigo", async ({ request, params }) => {
    await delay(400)
    const codigo = decodeURIComponent(String(params.codigo))
    const body = (await request.json()) as UpdateGradeGroupRequest
    const index = gradeGroupsDb.findIndex((row) => row.codigo === codigo)
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Grupo no encontrado." },
        { status: 404 }
      )
    }
    gradeGroupsDb[index] = { ...gradeGroupsDb[index], ...body }
    return HttpResponse.json({
      status: "ok",
      message: "Grupo actualizado.",
    })
  }),

  http.delete("/api/grade-groups/:codigo", async ({ params }) => {
    await delay(300)
    const codigo = decodeURIComponent(String(params.codigo))
    const index = gradeGroupsDb.findIndex((row) => row.codigo === codigo)
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Grupo no encontrado." },
        { status: 404 }
      )
    }
    gradeGroupsDb.splice(index, 1)
    return HttpResponse.json({
      status: "ok",
      message: "Grupo eliminado.",
    })
  }),
]
