import { delay, http, HttpResponse } from "msw"

import {
  campusesDb,
  campusesRowsDb,
  deleteCampusDetails,
  deleteManyCampusDetails,
  upsertCampusDetails,
} from "../db/campuses"

import type {
  Campus,
  CampusesQueryRequest,
  CampusesQueryResponse,
} from "@/features/establishment/api/types/campus"

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : []
}

function parseCampusesRequest(body: Partial<CampusesQueryRequest> | null): CampusesQueryRequest {
  const pageIndex = Number(body?.pageIndex ?? 0)
  const pageSize = Number(body?.pageSize ?? 10)

  return {
    filters: {
      search: typeof body?.filters?.search === "string" ? body.filters.search : undefined,
      zones: asArray(body?.filters?.zones),
    },
    sorting: Array.isArray(body?.sorting)
      ? body.sorting
          .filter((sort) => typeof sort?.id === "string" && sort.id.length > 0)
          .map((sort) => ({
            id: sort.id,
            desc: Boolean(sort.desc),
          }))
      : [],
    pageIndex: Number.isNaN(pageIndex) ? 0 : pageIndex,
    pageSize: Number.isNaN(pageSize) ? 10 : pageSize,
  }
}

async function readCampusesRequestBody(request: Request) {
  try {
    return (await request.json()) as Partial<CampusesQueryRequest>
  } catch {
    return null
  }
}

function applyFilters(rows: Campus[], filters: CampusesQueryRequest["filters"]): Campus[] {
  return rows.filter((row) => {
    if (filters.search) {
      const needle = filters.search.toLowerCase()
      const matches =
        row.name.toLowerCase().includes(needle) ||
        row.dane.includes(needle)

      if (!matches) {
        return false
      }
    }

    if (filters.zones?.length && !filters.zones.includes(row.zone.code)) {
      return false
    }

    return true
  })
}

function sortValue(row: Campus, id: string) {
  return row[id as keyof Campus]
}

function applySorting(
  rows: Campus[],
  sorting: CampusesQueryRequest["sorting"]
): Campus[] {
  if (!sorting.length) {
    return rows
  }

  const [{ id, desc }] = sorting

  const sorted = [...rows].sort((a, b) => {
    const av = sortValue(a, id)
    const bv = sortValue(b, id)

    if (av === bv) {
      return 0
    }

    return av > bv ? 1 : -1
  })

  return desc ? sorted.reverse() : sorted
}

export const campusHandlers = [
  http.post("*/api/establishments/campuses/query", async ({ request }) => {
    await delay(250)

    const body = await readCampusesRequestBody(request)
    const { filters, sorting, pageIndex, pageSize } = parseCampusesRequest(body)

    const filtered = applySorting(applyFilters(campusesRowsDb, filters), sorting)
    const totalCount = filtered.length
    const safePageSize = pageSize > 0 ? pageSize : 10
    const pageCount = Math.max(1, Math.ceil(totalCount / safePageSize))
    const start = pageIndex * safePageSize
    const rows = filtered.slice(start, start + safePageSize)

    return HttpResponse.json<CampusesQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  http.get("*/api/establishments/campuses/options", async () => {
    await delay(150)

    return HttpResponse.json({
      rows: campusesDb,
    })
  }),

  http.get("*/api/establishments/campuses/:id", async ({ params }) => {
    await delay(150)

    const campus = campusesDb.find((item) => item.id === params.id)

    if (!campus) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Sede no encontrada.",
        },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      status: "ok",
      campus,
    })
  }),

  http.post("*/api/establishments/campuses", async ({ request }) => {
    await delay(250)

    const values = (await request.json()) as Campus
    const campus: Campus = {
      ...values,
      id: values.id || `campus-${Date.now()}`,
    }

    const savedCampus = upsertCampusDetails(campus)

    return HttpResponse.json({
      status: "ok",
      message: "Sede creada.",
      campus: savedCampus,
    })
  }),

  http.put("*/api/establishments/campuses/:id", async ({ params, request }) => {
    await delay(250)

    const campusId = Array.isArray(params.id) ? params.id[0] : params.id

    if (!campusId) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Identificador de sede inválido.",
        },
        { status: 400 }
      )
    }

    const existing = campusesDb.find((item) => item.id === campusId)

    if (!existing) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Sede no encontrada.",
        },
        { status: 404 }
      )
    }

    const values = (await request.json()) as Campus
    const campus: Campus = {
      ...values,
      id: campusId,
    }

    const savedCampus = upsertCampusDetails(campus)

    return HttpResponse.json({
      status: "ok",
      message: "Sede actualizada.",
      campus: savedCampus,
    })
  }),

  http.delete("*/api/establishments/campuses/bulk-delete", async ({ request }) => {
    await delay(250)

    let ids: unknown
    try {
      ids = await request.json()
    } catch {
      return HttpResponse.json(
        {
          status: "error",
          message: "Cuerpo inválido. Se esperaba una lista de identificadores.",
        },
        { status: 400 },
      )
    }

    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Se esperaba una lista de identificadores (strings).",
        },
        { status: 400 },
      )
    }

    const uniqueIds = Array.from(new Set(ids.filter((id) => id.length > 0)))
    deleteManyCampusDetails(uniqueIds)

    return HttpResponse.json({
      status: "ok",
      message: `${uniqueIds.length} sede(s) eliminada(s).`,
      deletedCount: uniqueIds.length,
    })
  }),

  http.delete("*/api/establishments/campuses/:id", async ({ params }) => {
    await delay(250)

    const id = Array.isArray(params.id) ? params.id[0] : params.id

    // Guard defensivo: la ruta `bulk-delete` está registrada antes para
    // que MSW no la confunda con `:id`, pero si el orden cambia seguimos
    // devolviendo 404 sin dejar pasar `id === "bulk-delete"`.
    if (!id || id === "bulk-delete") {
      return HttpResponse.json(
        {
          status: "error",
          message: "Sede no encontrada.",
        },
        { status: 404 }
      )
    }

    const campus = campusesDb.find((item) => item.id === id)

    if (!campus) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Sede no encontrada.",
        },
        { status: 404 }
      )
    }

    deleteCampusDetails(campus.id)

    return HttpResponse.json({
      status: "ok",
      message: "Sede eliminada.",
    })
  }),

]