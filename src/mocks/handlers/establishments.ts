import { delay, http, HttpResponse } from "msw"

import {
  establishmentsDb,
  establishmentsRowsDb,
  deleteEstablishmentDetails,
  upsertEstablishmentDetails,
} from "../db/establishments"

import type {
  Establishment,
  EstablishmentDetails,
  EstablishmentStatus,
  EstablishmentsQueryRequest,
  EstablishmentsQueryResponse,
} from "@/features/establishment/api/types/establishment"

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : []
}

function parseEstablishmentsRequest(body: Partial<EstablishmentsQueryRequest> | null): EstablishmentsQueryRequest {
  const pageIndex = Number(body?.pageIndex ?? 0)
  const pageSize = Number(body?.pageSize ?? 10)

  return {
    filters: {
      search: typeof body?.filters?.search === "string" ? body.filters.search : undefined,
      status: asArray(body?.filters?.status) as EstablishmentStatus[],
      department: asArray(body?.filters?.department),
      municipality: asArray(body?.filters?.municipality),
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

async function readEstablishmentsRequestBody(request: Request) {
  try {
    return (await request.json()) as Partial<EstablishmentsQueryRequest>
  } catch {
    return null
  }
}

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
  http.post("*/api/establishments/query", async ({ request }) => {
    await delay(250)

    const body = await readEstablishmentsRequestBody(request)
    const { filters, sorting, pageIndex, pageSize } = parseEstablishmentsRequest(body)

    const filtered = applySorting(
      applyFilters(establishmentsRowsDb, filters),
      sorting
    )

    const totalCount = filtered.length
    const safePageSize = pageSize > 0 ? pageSize : 10
    const pageCount = Math.max(
      1,
      Math.ceil(totalCount / safePageSize)
    )
    const start = pageIndex * safePageSize
    const rows = filtered.slice(start, start + safePageSize)

    return HttpResponse.json<EstablishmentsQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

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

    return HttpResponse.json({
      status: "ok",
      message: "Establecimiento creado.",
      establishment: details,
    })
  }),

  http.put("*/api/establishments/:id", async ({ params, request }) => {
    await delay(250)

    const establishmentId = Array.isArray(params.id) ? params.id[0] : params.id

    if (!establishmentId) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Identificador de establecimiento inválido.",
        },
        { status: 400 }
      )
    }

    const existing = establishmentsDb.find((item) => item.id === establishmentId)

    if (!existing) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Establecimiento no encontrado.",
        },
        { status: 404 }
      )
    }

    const values = (await request.json()) as EstablishmentDetails
    const establishment: EstablishmentDetails = {
      ...values,
      id: establishmentId,
    }

    const { details } = upsertEstablishmentDetails(establishment)

    return HttpResponse.json({
      status: "ok",
      message: "Establecimiento actualizado.",
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