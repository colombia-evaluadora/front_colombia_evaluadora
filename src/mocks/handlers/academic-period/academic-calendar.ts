import { http, HttpResponse, delay } from "msw"

import {
  academicCalendarDb,
  type CalendarEntryRecord,
} from "@/mocks/db/academic-period/academic-calendar"
import { academicPeriodsDb } from "@/mocks/db/academic-period/academic-periods"
import { nextId } from "@/mocks/db/next-id"
import type { CalendarEntryRow } from "@/features/establishment/academic-period/api/query/use-academic-calendar"
import type { CalendarEntry } from "@/features/establishment/academic-period/api/types/academic-calendar"
import {
  formatCalendarRange,
  getColombianHolidays,
  getNonWorkingDays,
} from "@/features/establishment/academic-period/utils/academic-calendar"

interface CalendarEntryBody {
  FK_PERIODO_ACADEMICO: number
  TIPO: CalendarEntryRecord["tipo"]
  FECHA_DESDE: string
  FECHA_HASTA: string
  MOTIVO: string
}

const error = (message: string, status = 400) =>
  HttpResponse.json({ status: "error", message }, { status })

// Festivos del período (ids negativos: no tienen registro propio).
function holidayRows(periodId: number): CalendarEntryRow[] {
  const period = academicPeriodsDb.find((p) => p.id === periodId)
  if (!period) return []
  const years = new Set([Number(period.startDate.slice(0, 4)), Number(period.endDate.slice(0, 4))])
  return [...years]
    .flatMap(getColombianHolidays)
    .filter((h) => h.date >= period.startDate && h.date <= period.endDate)
    .map((h, i) => ({
      id: -(i + 1),
      tipo: "FESTIVO",
      origen: "FESTIVO",
      fecha_desde: h.date,
      fecha_hasta: h.date,
      motivo: h.name,
    }))
}

function calendarRows(periodId: number): CalendarEntryRow[] {
  const registered = academicCalendarDb
    .filter((e) => e.periodId === periodId)
    .map(({ periodId: _periodId, ...e }) => ({ ...e, origen: "REGISTRADO" as const }))
  return [...holidayRows(periodId), ...registered]
}

const toEntry = (row: CalendarEntryRow): CalendarEntry => ({
  id: row.id,
  type: row.tipo,
  origin: row.origen,
  from: row.fecha_desde,
  to: row.fecha_hasta,
  reason: row.motivo,
})

// Mismas validaciones que la Sección 5.8.
function validate(body: CalendarEntryBody, exceptId?: number) {
  const period = academicPeriodsDb.find((p) => p.id === body.FK_PERIODO_ACADEMICO)
  if (!period) return error("Período académico no encontrado.", 404)
  if (period.status === "C")
    return error("El período está cerrado: el calendario es de solo lectura.", 409)
  const motivo = body.MOTIVO?.trim() ?? ""
  if (motivo.length < 5 || motivo.length > 150)
    return error("El motivo debe tener de 5 a 150 caracteres.")
  if (body.FECHA_DESDE > body.FECHA_HASTA)
    return error("La Fecha hasta no puede ser anterior a la Fecha desde.")
  if (body.FECHA_DESDE < period.startDate || body.FECHA_HASTA > period.endDate) {
    return error("Las fechas deben estar dentro del Período Académico.")
  }
  if (body.TIPO === "HABIL") {
    const nonWorking = getNonWorkingDays(calendarRows(period.id).map(toEntry), exceptId)
    for (let d = new Date(`${body.FECHA_DESDE}T00:00`); ; d.setDate(d.getDate() + 1)) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      if (iso > body.FECHA_HASTA) break
      if (!nonWorking.has(iso))
        return error("Solo se puede marcar como hábil un día que sería inhábil.")
    }
  }
  // Excepción ya registrada sobre el mismo festivo.
  const duplicate = academicCalendarDb.some(
    (e) =>
      e.id !== exceptId &&
      e.periodId === period.id &&
      e.tipo === body.TIPO &&
      e.fecha_desde === body.FECHA_DESDE &&
      e.fecha_hasta === body.FECHA_HASTA,
  )
  if (duplicate) {
    return error(
      `Ya hay una entrada igual para ${formatCalendarRange(body.FECHA_DESDE, body.FECHA_HASTA)}.`,
      409,
    )
  }
  return null
}

export const academicCalendarHandlers = [
  http.get("/api/eval-col/calendario/:periodId", async ({ params }) => {
    await delay(200)
    return HttpResponse.json({ rows: calendarRows(Number(params.periodId)) })
  }),

  http.post("/api/eval-col/calendario", async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as CalendarEntryBody
    const invalid = validate(body)
    if (invalid) return invalid
    const id = nextId(
      academicCalendarDb.map((e) => e.id),
      1,
    )
    academicCalendarDb.push({
      id,
      periodId: body.FK_PERIODO_ACADEMICO,
      tipo: body.TIPO,
      fecha_desde: body.FECHA_DESDE,
      fecha_hasta: body.FECHA_HASTA,
      motivo: body.MOTIVO.trim(),
    })
    return HttpResponse.json({ rows: [{ fn_calendario_guardar: id }] })
  }),

  http.patch("/api/eval-col/calendario/:id/eliminar", async ({ params }) => {
    await delay(200)
    const index = academicCalendarDb.findIndex((e) => e.id === Number(params.id))
    if (index < 0) return error("Entrada del calendario no encontrada.", 404)
    academicCalendarDb.splice(index, 1)
    return HttpResponse.json({ rows: [] })
  }),

  http.put("/api/eval-col/calendario/:id", async ({ params, request }) => {
    await delay(300)
    const id = Number(params.id)
    const entry = academicCalendarDb.find((e) => e.id === id)
    if (!entry) return error("Entrada del calendario no encontrada.", 404)
    const body = (await request.json()) as CalendarEntryBody
    const invalid = validate(body, id)
    if (invalid) return invalid
    Object.assign(entry, {
      tipo: body.TIPO,
      fecha_desde: body.FECHA_DESDE,
      fecha_hasta: body.FECHA_HASTA,
      motivo: body.MOTIVO.trim(),
    })
    return HttpResponse.json({ rows: [{ fn_calendario_guardar: id }] })
  }),
]
