// src/features/academic-periods/api/mocks/academic-periods.handlers.ts

import { http, HttpResponse, delay } from "msw"
import {
  academicPeriodConfigsDb,
  academicPeriodsDb,
  sedesLookup,
} from "../../db/academic-period/academic-periods"
import type {
  AcademicPeriod,
  AcademicPeriodConfig,
  AcademicPeriodDetail,
  AcademicPeriodsQueryRequest,
  AcademicPeriodsQueryResponse,
  CreateAcademicPeriodRequest,
  ExportFormat,
  ExportResult,
  UpdateAcademicPeriodRequest,
} from "@/features/establishment/academic-period/api/types/academic-period"

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

function applyFilters(
  rows: AcademicPeriod[],
  filters: AcademicPeriodsQueryRequest["filters"]
): AcademicPeriod[] {
  return rows.filter((row) => {
    if (
      filters.sedeName &&
      !row.sedeName.toLowerCase().includes(filters.sedeName.toLowerCase())
    ) {
      return false
    }
    if (filters.schoolYearId && row.schoolYearId !== filters.schoolYearId) {
      return false
    }
    if (filters.status?.length && !filters.status.includes(row.status)) {
      return false
    }
    // Rango sobre startDate (yyyy-MM-dd ordena cronológicamente como string).
    if (filters.startFrom && row.startDate < filters.startFrom) {
      return false
    }
    if (filters.startTo && row.startDate > filters.startTo) {
      return false
    }
    return true
  })
}

function sortValue(row: AcademicPeriod, id: string) {
  return row[id as keyof AcademicPeriod]
}

function applySorting(
  rows: AcademicPeriod[],
  sorting: AcademicPeriodsQueryRequest["sorting"]
): AcademicPeriod[] {
  if (!sorting.length) return rows
  const [{ id, desc }] = sorting
  const sorted = [...rows].sort((a, b) => {
    const av = sortValue(a, id)
    const bv = sortValue(b, id)
    if (av === bv) return 0
    if (av == null) return -1
    if (bv == null) return 1
    return av > bv ? 1 : -1
  })
  return desc ? sorted.reverse() : sorted
}

export const academicPeriodsHandlers = [
  http.post("/api/academic-periods/query", async ({ request }) => {
    await delay(250)
    const body = (await request.json()) as AcademicPeriodsQueryRequest
    const { filters, sorting, pageIndex, pageSize } = body

    const filtered = applySorting(applyFilters(academicPeriodsDb, filters), sorting)
    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize
    const rows = filtered.slice(start, start + pageSize)

    return HttpResponse.json<AcademicPeriodsQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  http.post("/api/academic-periods/export", async ({ request }) => {
    await delay(600)
    const { ids, format } = (await request.json()) as {
      ids: number[]
      format: ExportFormat
    }
    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${ids.length} periodo(s) exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/academic-periods/export-all", async ({ request }) => {
    await delay(600)
    const { filters, format } = (await request.json()) as {
      filters: AcademicPeriodsQueryRequest["filters"]
      format: ExportFormat
    }
    const count = applyFilters(academicPeriodsDb, filters).length
    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} periodo(s) exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/academic-periods", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as CreateAcademicPeriodRequest
    const { config, ...periodData } = body
    const sede = sedesLookup.find((s) => s.id === periodData.sedeId)

    const id =
      academicPeriodsDb.reduce((max, p) => Math.max(max, p.id), 0) + 1
    const newPeriod: AcademicPeriod = {
      id,
      sedeName: sede?.name ?? "—",
      ...periodData,
    }
    academicPeriodsDb.push(newPeriod)
    academicPeriodConfigsDb.push({ academicPeriodId: id, ...config })

    return HttpResponse.json(newPeriod, { status: 201 })
  }),

  http.get("/api/academic-periods/:id", async ({ params }) => {
    await delay(250)
    const period = academicPeriodsDb.find(
      (p) => String(p.id) === String(params.id)
    )
    if (!period) {
      return HttpResponse.json(
        { status: "error", message: "Periodo no encontrado." },
        { status: 404 }
      )
    }
    const config =
      academicPeriodConfigsDb.find((c) => c.academicPeriodId === period.id) ??
      ({
        academicPeriodId: period.id,
        jornadaId: 0,
        reservationEnabled: true,
        defaultBlocksCount: null,
        scheduleStartTime: null,
        scheduleEndTime: null,
        breaks: [],
      } satisfies AcademicPeriodConfig)

    return HttpResponse.json<AcademicPeriodDetail>({ ...period, config })
  }),

  http.patch("/api/academic-periods/:id", async ({ params, request }) => {
    await delay(400)
    const index = academicPeriodsDb.findIndex(
      (p) => String(p.id) === String(params.id)
    )
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Periodo no encontrado." },
        { status: 404 }
      )
    }

    const body = (await request.json()) as UpdateAcademicPeriodRequest
    const { config, ...periodData } = body
    const id = academicPeriodsDb[index].id
    const sede = sedesLookup.find((s) => s.id === periodData.sedeId)

    academicPeriodsDb[index] = {
      ...academicPeriodsDb[index],
      ...periodData,
      id,
      sedeName: sede?.name ?? academicPeriodsDb[index].sedeName,
    }

    const configIndex = academicPeriodConfigsDb.findIndex(
      (c) => c.academicPeriodId === id
    )
    const nextConfig: AcademicPeriodConfig = { academicPeriodId: id, ...config }
    if (configIndex === -1) {
      academicPeriodConfigsDb.push(nextConfig)
    } else {
      academicPeriodConfigsDb[configIndex] = nextConfig
    }

    return HttpResponse.json({ status: "ok", message: "Periodo actualizado." })
  }),

  http.post("/api/academic-periods/bulk-delete", async ({ request }) => {
    await delay(300)
    const { ids } = (await request.json()) as { ids: number[] }
    const set = new Set(ids)
    const before = academicPeriodsDb.length
    for (let i = academicPeriodsDb.length - 1; i >= 0; i--) {
      if (set.has(academicPeriodsDb[i].id)) academicPeriodsDb.splice(i, 1)
    }
    return HttpResponse.json({
      status: "ok",
      message: "Periodos eliminados.",
      deleted: before - academicPeriodsDb.length,
    })
  }),

  http.delete("/api/academic-periods/:id", async ({ params }) => {
    await delay(300)
    const index = academicPeriodsDb.findIndex(
      (p) => String(p.id) === String(params.id)
    )
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Periodo no encontrado." },
        { status: 404 }
      )
    }
    academicPeriodsDb.splice(index, 1)
    return HttpResponse.json({ status: "ok", message: "Periodo eliminado." })
  }),
]