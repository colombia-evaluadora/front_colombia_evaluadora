import { http, HttpResponse, delay } from "msw"

import {
  GROUPS,
  INSTITUTIONS,
  OFFERED_SEATS_BY_CAMPUS,
  levelForGrade,
  reservationsDb,
} from "@/mocks/db/reservations"
import { academicPeriodsDb } from "@/mocks/db/academic-period/academic-periods"
import { EDUCATION_LEVELS, SHIFTS } from "@/features/coverage/api/schema"
import type {
  CreateReservationInput,
  ExportFormat,
  ExportResult,
  Reservation,
  ReservationsQueryFilters,
  ReservationsQueryRequest,
  ReservationsQueryResponse,
  ReservationsStats,
  ReservationsStatsRequest,
} from "@/features/coverage/api/types/reservation"

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

// Mismo helper que en auditoría: el valor puede venir como "yyyy-MM-dd" o
// "yyyy-MM-dd'T'HH:mm" según si el usuario tocó el TimePicker.
function toComparableIso(value: string, boundary: "start" | "end"): string {
  const hasTime = value.includes("T")
  const iso = hasTime ? value : `${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}`
  return new Date(iso).toISOString()
}

function matches(value: string, needle: string): boolean {
  return value.toLowerCase().includes(needle.toLowerCase())
}

function applyFilters(rows: Reservation[], filters: ReservationsQueryFilters): Reservation[] {
  return rows.filter((row) => {
    if (filters.firstName && !matches(row.firstName, filters.firstName)) return false
    if (filters.lastName && !matches(row.lastName, filters.lastName)) return false
    if (filters.documentNumber && !row.documentNumber.includes(filters.documentNumber)) return false
    if (filters.institution && !matches(row.institution, filters.institution)) return false
    if (filters.campus && !matches(row.campus, filters.campus)) return false
    if (filters.grade != null && row.grade !== filters.grade) return false
    if (filters.group && !matches(row.group, filters.group)) return false
    if (filters.shifts?.length && !filters.shifts.includes(row.shift)) return false
    if (filters.levels?.length && !filters.levels.includes(row.educationLevel)) return false
    if (filters.statuses?.length && !filters.statuses.includes(row.status)) return false
    if (filters.reservedFrom && row.reservedAt < toComparableIso(filters.reservedFrom, "start")) {
      return false
    }
    if (filters.reservedTo && row.reservedAt > toComparableIso(filters.reservedTo, "end")) {
      return false
    }
    return true
  })
}

function sortValue(row: Reservation, id: string): string | number {
  if (id === "student") return row.lastName
  return (row[id as keyof Reservation] ?? "") as string | number
}

function applySorting(
  rows: Reservation[],
  sorting: ReservationsQueryRequest["sorting"],
): Reservation[] {
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

// "Agrupar por" no filtra: reordena para que las filas de un mismo valor
// queden juntas. Se aplica después del sort para que el orden elegido por el
// usuario siga valiendo *dentro* de cada grupo.
function applyGrouping(
  rows: Reservation[],
  groupBy: ReservationsQueryFilters["groupBy"],
): Reservation[] {
  if (!groupBy) return rows
  const key = groupBy === "shift" ? "shift" : groupBy
  const buckets = new Map<string, Reservation[]>()
  for (const row of rows) {
    const bucketKey = String(row[key as keyof Reservation])
    const bucket = buckets.get(bucketKey)
    if (bucket) bucket.push(row)
    else buckets.set(bucketKey, [row])
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0))
    .flatMap(([, bucket]) => bucket)
}

function computeStats(rows: Reservation[]): ReservationsStats {
  const confirmed = rows.filter((row) => row.status === "confirmada").length
  const pending = rows.filter((row) => row.status === "pendiente").length
  const expired = rows.filter((row) => row.status === "vencida").length

  // La oferta se cuenta una vez por sede presente en el alcance — si el
  // usuario filtró a una sola sede, el % se lee contra esa oferta.
  const campuses = new Set(rows.map((row) => row.campus))
  const offeredSeats = [...campuses].reduce(
    (sum, campus) => sum + (OFFERED_SEATS_BY_CAMPUS[campus] ?? 0),
    0,
  )

  return {
    total: rows.length,
    confirmed,
    pending,
    expired,
    offeredSeats,
    byLevel: EDUCATION_LEVELS.map((key) => ({
      key,
      count: rows.filter((row) => row.educationLevel === key).length,
    })),
    byShift: SHIFTS.map((key) => ({
      key,
      count: rows.filter((row) => row.shift === key).length,
    })),
  }
}

export const reservationsHandlers = [
  http.post("/api/coverage/reservations/query", async ({ request }) => {
    await delay(300)
    const { filters, sorting, pageIndex, pageSize } =
      (await request.json()) as ReservationsQueryRequest

    const filtered = applyGrouping(
      applySorting(applyFilters(reservationsDb, filters), sorting),
      filters.groupBy,
    )
    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize

    return HttpResponse.json<ReservationsQueryResponse>({
      rows: filtered.slice(start, start + pageSize),
      pageCount,
      totalCount,
    })
  }),

  http.post("/api/coverage/reservations/stats", async ({ request }) => {
    await delay(200)
    const { ids, filters } = (await request.json()) as ReservationsStatsRequest
    const scoped = ids
      ? reservationsDb.filter((row) => ids.includes(row.id))
      : applyFilters(reservationsDb, filters ?? {})

    return HttpResponse.json<ReservationsStats>(computeStats(scoped))
  }),

  // `campuses`/`grades` ya no salen de acá — `use-reservation-catalogs-
  // query.ts` los pega directo a los endpoints reales (sedes del rector y
  // TLISTA_VALOR GRADOS). Institutions/groups todavía no tienen equivalente
  // real, así que se quedan acá.
  http.get("/api/coverage/reservations/catalogs", async () => {
    await delay(150)
    return HttpResponse.json({
      institutions: [...INSTITUTIONS],
      groups: [...GROUPS],
    })
  }),

  http.post("/api/coverage/reservations", async ({ request }) => {
    await delay(500)
    const input = (await request.json()) as CreateReservationInput

    // Regla de la HU "Desactivar periodo de reserva de cupos": si ningún
    // periodo académico tiene `reservationEnabled === true`, no se permite
    // crear nuevas reservas (los usuarios verían el botón deshabilitado en
    // otras pantallas; el back lo rechaza como segunda línea de defensa).
    const hasActivePeriod = academicPeriodsDb.some((p) => p.reservationEnabled)
    if (!hasActivePeriod) {
      return HttpResponse.json(
        {
          message:
            "No hay periodos académicos con reserva de cupos activa. Contacta al administrador.",
        },
        { status: 409 },
      )
    }

    // Una identificación no puede tener dos reservas activas.
    const duplicate = reservationsDb.find(
      (row) => row.documentNumber === input.documentNumber && row.status !== "vencida",
    )
    if (duplicate) {
      return HttpResponse.json(
        { message: "Ya existe una reserva activa para esta identificación." },
        { status: 409 },
      )
    }

    const created: Reservation = {
      ...input,
      id: crypto.randomUUID(),
      firstName: input.firstName.toUpperCase(),
      lastName: input.lastName.toUpperCase(),
      // El nivel se deriva del grado, igual que en la semilla: lo que mande
      // el cliente es solo una sugerencia de la UI.
      educationLevel: levelForGrade(input.grade),
      reservedAt: new Date().toISOString(),
      status: "pendiente",
    }
    reservationsDb.unshift(created)

    return HttpResponse.json<Reservation>(created, { status: 201 })
  }),

  http.post("/api/coverage/reservations/export", async ({ request }) => {
    await delay(600)
    const { ids, format } = (await request.json()) as { ids: string[]; format: ExportFormat }

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${ids.length} reserva(s) exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/coverage/reservations/export-all", async ({ request }) => {
    await delay(600)
    const { filters, format } = (await request.json()) as {
      filters: ReservationsQueryFilters
      format: ExportFormat
    }
    const count = applyFilters(reservationsDb, filters).length

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} reserva(s) exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),
]
