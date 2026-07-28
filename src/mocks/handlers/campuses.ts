import { delay, http, HttpResponse } from "msw"

import { httpQuery } from "./_http-query"

import {
  campusesDb,
  campusesRowsDb,
  deleteCampusDetails,
  upsertCampusDetails,
} from "../db/campuses"

import type {
  Campus,
  CampusesQueryRequest,
  CampusesQueryResponse,
} from "@/features/establishment/api/types/campus"

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
  httpQuery("*/api/establishments/campuses/query", async ({ request }) => {
    await delay(250)

    const body = (await request.json()) as CampusesQueryRequest
    const { filters, sorting, pageIndex, pageSize } = body

    const filtered = applySorting(applyFilters(campusesRowsDb, filters), sorting)
    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize
    const rows = filtered.slice(start, start + pageSize)

    return HttpResponse.json<CampusesQueryResponse>({
      rows,
      pageCount,
      totalCount,
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

    const existing = campusesDb.find((item) => item.id === params.id)

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
      id: params.id,
    }

    const savedCampus = upsertCampusDetails(campus)

    return HttpResponse.json({
      status: "ok",
      message: "Sede actualizada.",
      campus: savedCampus,
    })
  }),

  http.delete("*/api/establishments/campuses/:id", async ({ params }) => {
    await delay(250)

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

    deleteCampusDetails(campus.id)

    return HttpResponse.json({
      status: "ok",
      message: "Sede eliminada.",
    })
  }),
]