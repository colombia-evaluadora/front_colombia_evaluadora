// src/features/area-subjects/api/mocks/area-subjects.handlers.ts

import { http, HttpResponse, delay } from "msw"
import {
  areaSubjectsDb,
  nextAreaSubjectId,
} from "../../db/academic-period/area-subject"
import { generalAreasDb } from "../../db/academic-period/general-areas"
import { studyPlansDb } from "@/mocks/db/academic-period/study-plans"

import type {
  AreaSubject,
  AreaSubjectItem,
  AreaSubjectsQueryRequest,
  AreaSubjectsQueryResponse,
  CreateAreaSubjectRequest,
  UpdateAreaSubjectRequest,
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/area-subject"

// El front manda `asignaturaGeneral` como id (fk_area_asignatura). Para que el
// listado/edición sigan mostrando el nombre, el mock lo resuelve a nombre al
// guardar (el backend real trabaja con el id directamente).
function resolveSubjectAreaNames(
  subjects: AreaSubjectItem[] = []
): AreaSubjectItem[] {
  return subjects.map((s) => {
    const match = generalAreasDb.find(
      (a) => String(a.id) === String(s.asignaturaGeneral)
    )
    return match ? { ...s, asignaturaGeneral: match.nombre } : s
  })
}

// El área también manda su `areaGeneral` como id; se resuelve a nombre para el
// listado/edición (igual que las asignaturas).
function resolveAreaGeneralName(areaGeneral: string): string {
  const match = generalAreasDb.find((a) => String(a.id) === String(areaGeneral))
  return match ? match.nombre : areaGeneral
}

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

function applyFilters(
  rows: AreaSubject[],
  filters: AreaSubjectsQueryRequest["filters"]
): AreaSubject[] {
  return rows.filter((row) => {
    if (
      filters.areaGeneral &&
      !row.areaGeneral
        .toLowerCase()
        .includes(filters.areaGeneral.toLowerCase())
    ) {
      return false
    }

    if (
      filters.nombreInterno &&
      !row.nombreInterno
        .toLowerCase()
        .includes(filters.nombreInterno.toLowerCase())
    ) {
      return false
    }

    if (
      filters.abreviacion &&
      !row.abreviacion
        .toLowerCase()
        .includes(filters.abreviacion.toLowerCase())
    ) {
      return false
    }

    return true
  })
}

function sortValue(row: AreaSubject, id: string): string | number {
  const value = row[id as keyof AreaSubject]
  // `subjects` es un arreglo y no es ordenable; los demás campos son escalares.
  if (typeof value === "string" || typeof value === "number") return value
  return ""
}

function applySorting(
  rows: AreaSubject[],
  sorting: AreaSubjectsQueryRequest["sorting"]
): AreaSubject[] {
  if (!sorting.length) return rows

  const [{ id, desc }] = sorting

  const sorted = [...rows].sort((a, b) => {
    const av = sortValue(a, id)
    const bv = sortValue(b, id)

    if (av === bv) return 0
    return av > bv ? 1 : -1
  })

  return desc ? sorted.reverse() : sorted
}

export const areaSubjectsHandlers = [
  // Asignaturas del periodo: el backend agrega/expone la lista para que el
  // front no la derive aplanando las áreas en el cliente.
  http.get("/api/subjects", async ({ request }) => {
    await delay(150)
    const url = new URL(request.url)
    const periodParam = url.searchParams.get("academicPeriodId")
    const periodId = periodParam ? Number(periodParam) : null
    const scoped =
      periodId == null
        ? areaSubjectsDb
        : areaSubjectsDb.filter((row) => row.academicPeriodId === periodId)
    const names = Array.from(
      new Set(
        scoped
          .flatMap((area) => area.subjects.map((s) => s.nombreInterno))
          .filter(Boolean)
      )
    )
    return HttpResponse.json<string[]>(names)
  }),

  http.post("/api/area-subjects/query", async ({ request }) => {
    await delay(250)

    const body = (await request.json()) as AreaSubjectsQueryRequest
    const { filters, sorting, pageIndex, pageSize, academicPeriodId } = body

    const scoped =
      academicPeriodId == null
        ? areaSubjectsDb
        : areaSubjectsDb.filter(
            (row) => row.academicPeriodId === academicPeriodId
          )

    const filtered = applySorting(applyFilters(scoped, filters), sorting)

    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize

    const rows = filtered.slice(start, start + pageSize)

    return HttpResponse.json<AreaSubjectsQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
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

    const count = applyFilters(areaSubjectsDb, filters).length

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} área(s) exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/area-subjects", async ({ request }) => {
    await delay(400)

    const body = (await request.json()) as CreateAreaSubjectRequest

    // El código lo asigna el backend, no el front.
    const record = {
      ...body,
      areaGeneral: resolveAreaGeneralName(body.areaGeneral),
      subjects: resolveSubjectAreaNames(body.subjects),
      codigo: nextAreaSubjectId(),
      academicPeriodId: body.academicPeriodId ?? 0,
    }
    areaSubjectsDb.push(record)

    return HttpResponse.json(record, { status: 201 })
  }),

  http.patch("/api/area-subjects/:codigo", async ({ request, params }) => {
    await delay(400)
    const body = (await request.json()) as UpdateAreaSubjectRequest
    const index = areaSubjectsDb.findIndex(
      (row) => String(row.codigo) === String(params.codigo)
    )
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Área/asignatura no encontrada." },
        { status: 404 }
      )
    }
    const patched = {
      ...body,
      areaGeneral: resolveAreaGeneralName(body.areaGeneral),
      ...(body.subjects
        ? { subjects: resolveSubjectAreaNames(body.subjects) }
        : {}),
    }
    areaSubjectsDb[index] = { ...areaSubjectsDb[index], ...patched }
    return HttpResponse.json({
      status: "ok",
      message: "Área/asignatura actualizada.",
    })
  }),

  http.post("/api/area-subjects/bulk-delete", async ({ request }) => {
    await delay(300)
    const { ids } = (await request.json()) as { ids: number[] }
    const set = new Set(ids)
    const removedNames = new Set<string>()
    for (let i = areaSubjectsDb.length - 1; i >= 0; i--) {
      if (set.has(areaSubjectsDb[i].codigo)) {
        const [removed] = areaSubjectsDb.splice(i, 1)
        removedNames.add(removed.nombreInterno)
        removed.subjects.forEach((subject) =>
          removedNames.add(subject.nombreInterno)
        )
      }
    }
    // Misma cascada que el borrado individual: quitar los planes de estudio que
    // referencian el área o alguna de sus asignaturas.
    for (let i = studyPlansDb.length - 1; i >= 0; i--) {
      if (removedNames.has(studyPlansDb[i].asignatura)) {
        studyPlansDb.splice(i, 1)
      }
    }
    return HttpResponse.json({
      status: "ok",
      message: "Áreas/asignaturas eliminadas.",
    })
  }),

  http.delete("/api/area-subjects/:codigo", async ({ params }) => {
    await delay(300)
    const index = areaSubjectsDb.findIndex(
      (row) => String(row.codigo) === String(params.codigo)
    )
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Área/asignatura no encontrada." },
        { status: 404 }
      )
    }
    const [removed] = areaSubjectsDb.splice(index, 1)

    const removedNames = new Set<string>([
      removed.nombreInterno,
      ...removed.subjects.map((subject) => subject.nombreInterno),
    ])
    for (let i = studyPlansDb.length - 1; i >= 0; i--) {
      if (removedNames.has(studyPlansDb[i].asignatura)) {
        studyPlansDb.splice(i, 1)
      }
    }

    return HttpResponse.json({
      status: "ok",
      message: "Área/asignatura eliminada.",
    })
  }),
]