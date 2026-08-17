// src/features/area-subjects/api/mocks/area-subjects.handlers.ts

import { http, HttpResponse, delay } from "msw"
import { areasDb } from "../../db/academic-period/areas"
import { subjectsDb } from "../../db/academic-period/subjects"

import type {
  AreaSubjectsQueryRequest,
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/area-subject"

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

function scopedAreaIds(academicPeriodId: number | null): Set<number> {
  const scoped =
    academicPeriodId == null
      ? areasDb
      : areasDb.filter((row) => row.academicPeriodId === academicPeriodId)
  return new Set(scoped.map((row) => row.id))
}

// Área y asignatura ya son recursos reales separados (`areas.ts`/`subjects.ts`
// mocks); acá solo quedan los usos transversales que otros módulos todavía
// consumen por nombre: el catálogo de nombres de asignatura (usado por
// criterio de promoción) y el export (sin endpoint real en el contrato).
export const areaSubjectsHandlers = [
  http.get("/api/subjects", async ({ request }) => {
    await delay(150)
    const url = new URL(request.url)
    const periodParam = url.searchParams.get("academicPeriodId")
    const periodId = periodParam ? Number(periodParam) : null
    const areaIds = scopedAreaIds(periodId)
    const names = Array.from(
      new Set(
        subjectsDb
          .filter((subject) => areaIds.has(subject.areaId))
          .map((subject) => subject.nombreInterno)
          .filter(Boolean)
      )
    )
    return HttpResponse.json<string[]>(names)
  }),

  http.post("/api/area-subjects/export", async ({ request }) => {
    await delay(600)

    const { ids, format } = (await request.json()) as {
      ids: number[]
      format: ExportFormat
    }

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${ids.length} área(s) exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/area-subjects/export-all", async ({ request }) => {
    await delay(600)

    const { filters, format } = (await request.json()) as {
      filters: AreaSubjectsQueryRequest["filters"]
      format: ExportFormat
    }

    const needle = filters.nombreInterno?.toLowerCase()
    const count = areasDb.filter(
      (row) => !needle || row.nombreInterno.toLowerCase().includes(needle)
    ).length

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} área(s) exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),
]
