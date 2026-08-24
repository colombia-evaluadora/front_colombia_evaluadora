import { http, HttpResponse, delay } from "msw"

import { reservationsDb, OFFERED_SEATS_BY_CAMPUS, GROUPS } from "@/mocks/db/reservations"
import type {
  PreMatricula,
  PreMatriculaCatalogsRequest,
  PreMatriculaCatalogsResponse,
  PreMatriculaGroupsByCampus,
  PreMatriculaQueryRequest,
  PreMatriculaQueryResponse,
  PreMatriculaStatus,
} from "@/features/coverage/api/types/pre-matricula"
import type { ReservationsQueryFilters, Reservation } from "@/features/coverage/api/types/reservation"

function matches(value: string, needle: string): boolean {
  return value.toLowerCase().includes(needle.toLowerCase())
}

function applyFilters(rows: Reservation[], filters: ReservationsQueryFilters): Reservation[] {
  return rows.filter((row) => {
    if (filters.firstName && !matches(row.firstName, filters.firstName)) return false
    if (filters.lastName && !matches(row.lastName, filters.lastName)) return false
    if (filters.documentNumber && !row.documentNumber.includes(filters.documentNumber)) return false
    if (filters.campus && !matches(row.campus, filters.campus)) return false
    if (filters.grade != null && row.grade !== filters.grade) return false
    return true
  })
}

function toPreMatricula(row: Reservation): PreMatricula {
  // Reprobado: ~25 % de los casos, determinístico por documento.
  const failed = row.documentNumber.charCodeAt(1) % 10 < 3
  // Un reprobado repite su grado actual; los demás aspiran al grado siguiente
  // (null en grado 11: no hay grado al que aspirar).
  const targetGrade = failed ? row.grade : row.grade < 11 ? row.grade + 1 : null
  // Hay cupo si la sede tiene oferta y el grado al que aspira es válido.
  // Simulamos: ~70 % de los casos tienen cupo disponible.
  const hasSlot =
    OFFERED_SEATS_BY_CAMPUS[row.campus] != null
      ? row.documentNumber.charCodeAt(0) % 10 >= 3
      : false

  const status: PreMatriculaStatus = hasSlot ? "con_cupo" : "sin_cupo"

  return {
    id: row.id,
    documentNumber: row.documentNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    campus: row.campus,
    grade: row.grade,
    failed,
    targetGrade,
    hasSlot,
    status,
  }
}

function sortValue(row: PreMatricula, id: string): string | number {
  return (row[id as keyof PreMatricula] ?? "") as string | number
}

function applySorting(
  rows: PreMatricula[],
  sorting: PreMatriculaQueryRequest["sorting"],
): PreMatricula[] {
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

export const preMatriculaHandlers = [
  http.post("/api/coverage/pre-matricula/query", async ({ request }) => {
    await delay(300)
    const { filters, sorting, pageIndex, pageSize } =
      (await request.json()) as PreMatriculaQueryRequest

    const filteredReservations = applyFilters(reservationsDb, filters)
    const rows = applySorting(filteredReservations.map(toPreMatricula), sorting)

    const totalCount = rows.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize

    return HttpResponse.json<PreMatriculaQueryResponse>({
      rows: rows.slice(start, start + pageSize),
      pageCount,
      totalCount,
    })
  }),

  /**
   * Devuelve los grupos disponibles agrupados por sede para los registros
   * seleccionados. Si `ids` está vacío, usa todas las sedes.
   */
  http.post("/api/coverage/pre-matricula/catalogs", async ({ request }) => {
    await delay(150)
    const { ids } = (await request.json()) as PreMatriculaCatalogsRequest

    const selectedRows = ids.length
      ? reservationsDb.filter((r) => ids.includes(r.id))
      : reservationsDb

    const campusSet = [...new Set(selectedRows.map((r) => r.campus))].sort()

    const result: PreMatriculaGroupsByCampus[] = campusSet.map((campus) => ({
      campus,
      groups: [...GROUPS].sort(),
    }))

    return HttpResponse.json<PreMatriculaCatalogsResponse>(result)
  }),

  http.delete("/api/coverage/pre-matricula/:id", async ({ params }) => {
    await delay(300)
    const { id } = params as { id: string }
    const index = reservationsDb.findIndex((r) => r.id === id)

    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Registro no encontrado." },
        { status: 404 },
      )
    }

    reservationsDb.splice(index, 1)
    return HttpResponse.json({ status: "ok", message: "Registro eliminado correctamente." })
  }),
]
