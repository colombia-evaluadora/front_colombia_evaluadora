// src/features/academic-periods/api/mocks/academic-periods.handlers.ts

import { http, HttpResponse, delay } from "msw"
import {
  academicPeriodConfigsDb,
  academicPeriodsDb,
  sedesLookup,
} from "../../db/academic-period/academic-periods"
import { academicPeriodStatusesDb } from "../../db/academic-period/academic-period-statuses"
import { jornadasDb } from "../../db/academic-period/jornadas"
import type {
  AcademicPeriod,
  AcademicPeriodConfig,
  AcademicPeriodsQueryRequest,
  CreateAcademicPeriodRequest,
  ExportFormat,
  ExportResult,
  UpdateAcademicPeriodRequest,
} from "@/features/establishment/academic-period/api/types/academic-period"

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

// El front manda el body PLANO con las llaves de `fn_periodo_crear`. El mock
// mantiene su modelo interno (periodo + config), así que aquí revertimos ese
// shaping: llaves UPPER_SNAKE → campos del dominio, "S"/"N" → boolean y los
// `TIME[]` paralelos → `breaks[]`.
function fromCreateRequest(body: CreateAcademicPeriodRequest): {
  period: Pick<
    AcademicPeriod,
    | "sedeId"
    | "statusId"
    | "previousPeriodId"
    | "startDate"
    | "endDate"
    | "enrollmentDeadline"
  >
  config: Omit<AcademicPeriodConfig, "academicPeriodId">
} {
  const starts = body.DESCANSO_INICIO ?? []
  const ends = body.DESCANSO_FIN ?? []
  return {
    period: {
      sedeId: String(body.FK_SEDE),
      statusId: body.FK_ESTADO,
      previousPeriodId: body.FK_PERIODO_ANTERIOR,
      startDate: body.FECHA_INICIO,
      endDate: body.FECHA_FIN,
      enrollmentDeadline: body.FECHA_LIMITE_MATRICULA,
    },
    config: {
      jornadaId: body.FK_JORNADA,
      reservationEnabled: body.RESERVA === "S",
      defaultBlocksCount: body.BLOQUES_POR_DEFECTO,
      scheduleStartTime: body.HORA_INICIO,
      scheduleEndTime: body.HORA_FIN,
      breaks: starts.map((startTime, i) => ({
        startTime,
        endTime: ends[i] ?? "",
      })),
    },
  }
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
    if (
      filters.statusId?.length &&
      (row.statusId == null || !filters.statusId.includes(row.statusId))
    ) {
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
  http.post("/api/eval-col/periodos-academicos/query", async ({ request }) => {
    await delay(250)
    // Body plano UPPER_SNAKE (igual que el endpoint real); se revierte al shape
    // interno de filtros/orden que ya usan applyFilters/applySorting.
    const body = (await request.json()) as {
      FK_SEDE: number | null
      NOMBRE_SEDE: string | null
      ANO: string | null
      FK_ESTADO: number | null
      FECHA_DESDE: string | null
      FECHA_HASTA: string | null
      PAGEINDEX: number
      PAGESIZE: number
      SORT_BY: string | null
      SORT_DIR: "asc" | "desc" | null
    }
    const filters: AcademicPeriodsQueryRequest["filters"] = {
      sedeName: body.NOMBRE_SEDE ?? undefined,
      schoolYearId: body.ANO != null ? Number(body.ANO) : undefined,
      statusId: body.FK_ESTADO != null ? [body.FK_ESTADO] : undefined,
      startFrom: body.FECHA_DESDE ?? undefined,
      startTo: body.FECHA_HASTA ?? undefined,
    }
    const sorting: AcademicPeriodsQueryRequest["sorting"] = body.SORT_BY
      ? [{ id: body.SORT_BY, desc: body.SORT_DIR === "desc" }]
      : []
    const pageIndex = body.PAGEINDEX
    const pageSize = body.PAGESIZE

    const filtered = applySorting(applyFilters(academicPeriodsDb, filters), sorting)
    const totalCount = filtered.length
    const start = pageIndex * pageSize
    // Devuelve el MISMO shape crudo que el endpoint real (snake_case, códigos y
    // `total_count` por fila, sin envelope); el front lo mapea/enveuelve.
    const rows = filtered.slice(start, start + pageSize).map((row) => {
      const config = academicPeriodConfigsDb.find(
        (c) => c.academicPeriodId === row.id
      )
      return {
        id: row.id,
        sede_id: Number(row.sedeId),
        sede_name: row.sedeName,
        school_year_id: row.schoolYearId,
        school_year_name: String(row.schoolYearId),
        status_id: row.statusId ?? null,
        status: row.status,
        status_name: row.statusName ?? row.status,
        start_date: row.startDate,
        end_date: row.endDate,
        enrollment_deadline: row.enrollmentDeadline,
        name: row.name,
        jornada_id: config?.jornadaId ?? null,
        reserva: config?.reservationEnabled ? "S" : "N",
        default_blocks_count: config?.defaultBlocksCount ?? 0,
        schedule_start_time: config?.scheduleStartTime ?? null,
        schedule_end_time: config?.scheduleEndTime ?? null,
        total_count: totalCount,
      }
    })

    return HttpResponse.json({ rows })
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

  http.post("/api/eval-col/periodos-academicos", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as CreateAcademicPeriodRequest
    const { period: periodData, config } = fromCreateRequest(body)
    // `sedeId` viaja como string en el dominio de periodo académico
    // (`fromCreateRequest` hace `String(body.FK_SEDE)`) y las sedes tienen id
    // numérico: sin el cast la comparación nunca es cierta y `sede` queda
    // siempre `undefined`.
    const sede = sedesLookup.find((s) => s.id === Number(periodData.sedeId))
    // El back guarda el estado por id; resolvemos el código/etiqueta para el listado.
    const statusOption = academicPeriodStatusesDb.find(
      (s) => s.id === periodData.statusId
    )
    // El back DERIVA el año lectivo (del año de inicio) y el nombre.
    const schoolYearId = periodData.startDate
      ? new Date(periodData.startDate).getFullYear()
      : new Date().getFullYear()

    const id =
      academicPeriodsDb.reduce((max, p) => Math.max(max, p.id), 0) + 1
    const newPeriod: AcademicPeriod = {
      id,
      sedeName: sede?.name ?? "—",
      status: statusOption?.key ?? "A",
      statusName: statusOption?.label,
      schoolYearId,
      name: `Año lectivo ${schoolYearId}`,
      minAbsences: null,
      weeksCount: null,
      minFailedSubjects: null,
      isPrincipal: true,
      ...periodData,
    }
    academicPeriodsDb.push(newPeriod)
    academicPeriodConfigsDb.push({ academicPeriodId: id, ...config })

    // Mismo shape que la respuesta real (`{rows: [{fn_periodo_crear: <id>}]}`)
    // — `create-academic-period.ts` lo desenvuelve con `extractWriteResultId`;
    // devolver el período completo acá (como antes) dejaba `created.id` en
    // `NaN` y rompía la navegación a la pantalla de edición tras crear.
    return HttpResponse.json({ rows: [{ fn_periodo_crear: id }] }, { status: 201 })
  }),

  // Candidatos a "periodo anterior" de una sede (activos, excluyendo el que se
  // edita) — `fn_periodo_anteriores_por_sede`.
  http.post("/api/eval-col/periodos-academicos/anterior", async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as {
      FK_SEDE: number
      FK_PERIODO: number | null
    }
    const rows = academicPeriodsDb
      .filter((p) => String(p.sedeId) === String(body.FK_SEDE))
      .filter((p) =>
        body.FK_PERIODO ? p.id !== body.FK_PERIODO : true
      )
      .map((p) => ({ id: p.id, name: p.name }))
    return HttpResponse.json({ rows })
  }),

  http.get("/api/eval-col/periodos-academicos/:id", async ({ params }) => {
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
    const jornada = jornadasDb.find((j) => j.id === config.jornadaId)

    // Mismo shape que la respuesta real (`{rows: [...]}`, snake_case) — el
    // hook (`use-academic-period.ts`) lo desenvuelve con `raw.rows?.[0]` y
    // mapea campo por campo; devolver `AcademicPeriodDetail` plano acá (como
    // antes) hacía que `raw.rows?.[0]` fuera `undefined` y toda la pantalla
    // de edición cayera en el estado de error.
    return HttpResponse.json({
      rows: [
        {
          id: period.id,
          sede_id: Number(period.sedeId),
          sede_name: period.sedeName,
          school_year_id: period.schoolYearId,
          school_year_name: String(period.schoolYearId),
          status_id: period.statusId ?? 0,
          status: period.status,
          status_name: period.statusName,
          start_date: period.startDate,
          end_date: period.endDate,
          enrollment_deadline: period.enrollmentDeadline,
          name: period.name,
          jornada_id: config.jornadaId,
          jornada: jornada?.name ?? "",
          jornada_name: jornada?.name ?? "",
          reserva: config.reservationEnabled ? "S" : "N",
          default_blocks_count: config.defaultBlocksCount,
          schedule_start_time: config.scheduleStartTime,
          schedule_end_time: config.scheduleEndTime,
          descansos: config.breaks,
          previous_period_id: period.previousPeriodId,
        },
      ],
    })
  }),

  // `fn_periodo_actualizar` (id_query 105) — path/método reales (ver
  // `update-academic-period.ts`): `PUT .../editar/:ID`, no
  // `PATCH .../:ID`. Sin esto, guardar cambios en un periodo académico
  // caía al mismo bug de logout que Criterio de promoción — la request no
  // matcheaba ningún handler y pasaba de largo al backend real.
  http.put("/api/eval-col/periodos-academicos/editar/:id", async ({ params, request }) => {
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
    const { period: periodData, config } = fromCreateRequest(body)
    const id = academicPeriodsDb[index].id
    // Mismo cast que en el alta: `sedeId` es string y las sedes tienen id
    // numérico, así que sin `Number(...)` la sede nunca se encuentra.
    const sede = sedesLookup.find((s) => s.id === Number(periodData.sedeId))
    const statusOption = academicPeriodStatusesDb.find(
      (s) => s.id === periodData.statusId
    )
    // El back re-deriva año lectivo/nombre al cambiar la fecha de inicio.
    const schoolYearId = periodData.startDate
      ? new Date(periodData.startDate).getFullYear()
      : academicPeriodsDb[index].schoolYearId

    academicPeriodsDb[index] = {
      ...academicPeriodsDb[index],
      ...periodData,
      id,
      status: statusOption?.key ?? academicPeriodsDb[index].status,
      statusName: statusOption?.label ?? academicPeriodsDb[index].statusName,
      schoolYearId,
      name: `Año lectivo ${schoolYearId}`,
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

  // `fn_periodo_bulk_delete`, expuesto como PUT (no POST).
  http.put("/api/eval-col/periodos-academicos", async ({ request }) => {
    await delay(300)
    const { IDS } = (await request.json()) as { IDS: number[] }
    const set = new Set(IDS)
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

  // `fn_periodo_soft_delete` es un soft delete expuesto como PUT (no DELETE).
  http.put("/api/eval-col/periodos-academicos/:id", async ({ params }) => {
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