import { delay, http, HttpResponse } from "msw"

import {
  curricularReferencesDb,
  deleteCurricularReference,
  takeNextCurricularReferenceId,
  upsertCurricularReference,
} from "@/mocks/db/academic-management/curricular-references"

import type {
  CurricularReference,
  CurricularReferenceDraft,
  CurricularReferencesQueryRequest,
  CurricularReferencesQueryResponse,
} from "@/features/academic-management/curricular-references/api/types/curricular-reference"

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : []
}

function parseRequest(body: Partial<CurricularReferencesQueryRequest> | null): CurricularReferencesQueryRequest {
  const pageIndex = Number(body?.pageIndex ?? 0)
  const pageSize = Number(body?.pageSize ?? 10)

  return {
    filters: {
      search: typeof body?.filters?.search === "string" ? body.filters.search : undefined,
      educationLevels: asStringArray(body?.filters?.educationLevels),
      pedagogicalApproaches: asStringArray(body?.filters?.pedagogicalApproaches),
      evaluationTypes: asStringArray(body?.filters?.evaluationTypes),
      active: typeof body?.filters?.active === "string" ? body.filters.active : undefined,
    },
    sorting: Array.isArray(body?.sorting)
      ? body.sorting
          .filter((sort) => typeof sort?.id === "string" && sort.id.length > 0)
          .map((sort) => ({ id: sort.id, desc: Boolean(sort.desc) }))
      : [],
    pageIndex: Number.isNaN(pageIndex) ? 0 : pageIndex,
    pageSize: Number.isNaN(pageSize) ? 10 : pageSize,
  }
}

async function readRequestBody(request: Request) {
  try {
    return (await request.json()) as Partial<CurricularReferencesQueryRequest>
  } catch {
    return null
  }
}

function applyFilters(
  rows: CurricularReference[],
  filters: CurricularReferencesQueryRequest["filters"],
): CurricularReference[] {
  return rows.filter((row) => {
    if (filters.search) {
      const needle = filters.search.toLowerCase()
      const matches =
        row.name.toLowerCase().includes(needle) ||
        row.instrument.toLowerCase().includes(needle) ||
        (row.pedagogicalApproach?.name.toLowerCase().includes(needle) ?? false)

      if (!matches) return false
    }

    if (
      filters.educationLevels?.length &&
      !row.educationLevels.some((level) => filters.educationLevels!.includes(String(level.id)))
    ) {
      return false
    }

    if (
      filters.pedagogicalApproaches?.length &&
      !filters.pedagogicalApproaches.includes(String(row.pedagogicalApproach?.id ?? ""))
    ) {
      return false
    }

    if (
      filters.evaluationTypes?.length &&
      !filters.evaluationTypes.includes(String(row.evaluationType?.id ?? ""))
    ) {
      return false
    }

    if (filters.active && filters.active !== String(row.active)) {
      return false
    }

    return true
  })
}

function sortValue(row: CurricularReference, id: string) {
  if (id === "educationLevel") return row.educationLevels.map((level) => level.name).join(", ")
  if (id === "pedagogicalApproach") return row.pedagogicalApproach?.name ?? ""
  if (id === "evaluationType") return row.evaluationType?.name ?? ""
  return row[id as keyof CurricularReference]
}

function applySorting(
  rows: CurricularReference[],
  sorting: CurricularReferencesQueryRequest["sorting"],
): CurricularReference[] {
  if (!sorting.length) return rows

  const [{ id, desc }] = sorting
  const sorted = [...rows].sort((a, b) => {
    const av = sortValue(a, id)
    const bv = sortValue(b, id)
    if (av === bv) return 0
    return (av ?? "") > (bv ?? "") ? 1 : -1
  })

  return desc ? sorted.reverse() : sorted
}

export const curricularReferencesHandlers = [
  http.post("*/api/academic-management/curricular-references/query", async ({ request }) => {
    await delay(250)

    const body = await readRequestBody(request)
    const { filters, sorting, pageIndex, pageSize } = parseRequest(body)

    const filtered = applySorting(applyFilters(curricularReferencesDb, filters), sorting)
    const totalCount = filtered.length
    const safePageSize = pageSize > 0 ? pageSize : 10
    const pageCount = Math.max(1, Math.ceil(totalCount / safePageSize))
    const start = pageIndex * safePageSize
    const rows = filtered.slice(start, start + safePageSize)

    return HttpResponse.json<CurricularReferencesQueryResponse>({ rows, pageCount, totalCount })
  }),

  http.get("*/api/academic-management/curricular-references/:id", async ({ params }) => {
    await delay(150)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const id = idParam ? Number(idParam) : NaN
    const curricularReference = curricularReferencesDb.find((item) => item.id === id)

    if (!curricularReference) {
      return HttpResponse.json(
        { status: "error", message: "Referente curricular no encontrado." },
        { status: 404 },
      )
    }

    return HttpResponse.json({ status: "ok", curricularReference })
  }),

  http.get("*/api/academic-management/curricular-references/:id/areas", async ({ params }) => {
    await delay(150)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const id = idParam ? Number(idParam) : NaN
    const curricularReference = curricularReferencesDb.find((item) => item.id === id)
    const rows = (curricularReference?.areas ?? []).map((area) => ({
      pk_referente_curricular_area: area.id,
      fk_tarea_asignatura: area.id,
      nombre: area.name,
    }))

    return HttpResponse.json(rows)
  }),

  http.post("*/api/academic-management/curricular-references", async ({ request }) => {
    await delay(250)

    const values = (await request.json()) as CurricularReferenceDraft
    const reference: CurricularReference = {
      ...values,
      id: takeNextCurricularReferenceId(),
      // Alta nueva: siempre arranca su historial hoy, sin desactivación
      // previa — aplica igual si nace activo o inactivo (ver
      // `curricularReferenceStatusPeriod`).
      createdYear: new Date().getFullYear(),
      deactivatedYear: null,
    }
    const saved = upsertCurricularReference(reference)

    return HttpResponse.json({
      status: "ok",
      message: "Referente curricular creado.",
      curricularReference: saved,
    })
  }),

  http.put("*/api/academic-management/curricular-references/:id", async ({ params, request }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const id = idParam ? Number(idParam) : NaN

    if (!idParam || Number.isNaN(id)) {
      return HttpResponse.json(
        { status: "error", message: "Identificador de referente inválido." },
        { status: 400 },
      )
    }

    const existing = curricularReferencesDb.find((item) => item.id === id)
    if (!existing) {
      return HttpResponse.json(
        { status: "error", message: "Referente curricular no encontrado." },
        { status: 404 },
      )
    }

    const values = (await request.json()) as CurricularReferenceDraft
    // El `hasta` del período solo se fija en la transición activo → inactivo;
    // reactivarlo limpia esa marca (vuelve a leerse como "Desde <alta>").
    let deactivatedYear = existing.deactivatedYear
    if (values.active && !existing.active) {
      deactivatedYear = null
    } else if (!values.active && existing.active) {
      deactivatedYear = new Date().getFullYear()
    }

    const saved = upsertCurricularReference({
      ...values,
      id,
      createdYear: existing.createdYear,
      deactivatedYear,
    })

    return HttpResponse.json({
      status: "ok",
      message: "Referente curricular actualizado.",
      curricularReference: saved,
    })
  }),

  http.delete("*/api/academic-management/curricular-references/:id", async ({ params }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const id = idParam ? Number(idParam) : NaN
    const existing = curricularReferencesDb.find((item) => item.id === id)

    if (!existing) {
      return HttpResponse.json(
        { status: "error", message: "Referente curricular no encontrado." },
        { status: 404 },
      )
    }

    deleteCurricularReference(id)

    return HttpResponse.json({ status: "ok", message: "Referente curricular eliminado." })
  }),

  http.post("*/api/academic-management/curricular-references/export", async ({ request }) => {
    await delay(600)

    const body = (await request.json()) as { filters?: CurricularReferencesQueryRequest["filters"] }
    const count = applyFilters(curricularReferencesDb, body?.filters ?? {}).length

    return HttpResponse.json({
      status: "ok",
      message: `${count} referente(s) curricular(es) exportado(s).`,
    })
  }),
]
