import { delay, http, HttpResponse } from "msw"

import { httpQuery } from "./_http-query"

import {
  establishmentsDb,
  establishmentsRowsDb,
  deleteEstablishmentDetails,
  upsertEstablishmentDetails,
} from "../db/establishments"

import type {
  Establishment,
  EstablishmentDetails,
  EstablishmentsQueryRequest,
  EstablishmentsQueryResponse,
} from "@/features/establishment/api/types/establishment"

function applyFilters(
  rows: Establishment[],
  filters: EstablishmentsQueryRequest["filters"]
): Establishment[] {
  return rows.filter((row) => {
    if (filters.search) {
      const needle = filters.search.toLowerCase()

      const matches =
        row.name.toLowerCase().includes(needle) ||
        row.dane.includes(needle) ||
        row.department.toLowerCase().includes(needle) ||
        row.municipality.toLowerCase().includes(needle)

      if (!matches) {
        return false
      }
    }

    if (
      filters.status?.length &&
      !filters.status.includes(row.status)
    ) {
      return false
    }

    if (
      filters.department?.length &&
      !filters.department.includes(row.department)
    ) {
      return false
    }

    if (
      filters.municipality?.length &&
      !filters.municipality.includes(row.municipality)
    ) {
      return false
    }

    return true
  })
}

function sortValue(
  row: Establishment,
  id: string
) {
  return row[id as keyof Establishment]
}

function applySorting(
  rows: Establishment[],
  sorting: EstablishmentsQueryRequest["sorting"]
): Establishment[] {
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

export const establishmentHandlers = [
  httpQuery(
    "*/api/establishments/query",
    async ({ request }) => {
      await delay(250)

      const body =
        (await request.json()) as EstablishmentsQueryRequest

      const {
        filters,
        sorting,
        pageIndex,
        pageSize,
      } = body

      const filtered = applySorting(
        applyFilters(establishmentsRowsDb, filters),
        sorting
      )

      const totalCount = filtered.length

      const pageCount = Math.max(
        1,
        Math.ceil(totalCount / pageSize)
      )

      const start = pageIndex * pageSize

      const rows = filtered.slice(
        start,
        start + pageSize
      )

      return HttpResponse.json<EstablishmentsQueryResponse>({
        rows,
        pageCount,
        totalCount,
      })
    }
  ),

  http.get("*/api/establishments/:id", async ({ params }) => {
    await delay(150)

    const establishment = establishmentsDb.find((item) => item.id === params.id)

    if (!establishment) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Establecimiento no encontrado.",
        },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      status: "ok",
      establishment,
    })
  }),

  http.post("*/api/establishments", async ({ request }) => {
    await delay(250)

    const values = (await request.json()) as EstablishmentDetails

    const establishment: EstablishmentDetails = {
      ...values,
      id: values.id || `establishment-${Date.now()}`,
    }

    const { details } = upsertEstablishmentDetails(establishment)

    const isEdit = Boolean(values.id && establishmentsDb.some((item) => item.id === values.id))

    return HttpResponse.json({
      status: "ok",
      message: isEdit ? "Establecimiento actualizado." : "Establecimiento creado.",
      establishment: details,
    })
  }),

  http.delete("*/api/establishments/:id", async ({ params }) => {
    await delay(250)

    const establishment = establishmentsDb.find((item) => item.id === params.id)

    if (!establishment) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Establecimiento no encontrado.",
        },
        { status: 404 }
      )
    }

    deleteEstablishmentDetails(establishment.id)

    return HttpResponse.json({
      status: "ok",
      message: "Establecimiento eliminado.",
    })
  }),

]