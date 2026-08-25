import { http, HttpResponse, delay } from "msw"

import { enrollmentsDb } from "@/mocks/db/enrollments"
import type {
  Enrollment,
  EnrollmentsQueryRequest,
  EnrollmentsQueryResponse,
} from "@/features/coverage/api/types/enrollment"
import type { ReservationsQueryFilters } from "@/features/coverage/api/types/reservation"

function matches(value: string, needle: string): boolean {
  return value.toLowerCase().includes(needle.toLowerCase())
}

function applyFilters(rows: Enrollment[], filters: ReservationsQueryFilters): Enrollment[] {
  return rows.filter((row) => {
    if (filters.firstName && !matches(row.firstName, filters.firstName)) return false
    if (filters.lastName && !matches(row.lastName, filters.lastName)) return false
    if (filters.documentNumber && !row.documentNumber.includes(filters.documentNumber)) return false
    if (filters.campus && !matches(row.campus, filters.campus)) return false
    if (filters.grade != null && row.grade !== filters.grade) return false
    return true
  })
}

function sortValue(row: Enrollment, id: string): string | number {
  return (row[id as keyof Enrollment] ?? "") as string | number
}

function applySorting(
  rows: Enrollment[],
  sorting: EnrollmentsQueryRequest["sorting"],
): Enrollment[] {
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

export const enrollmentsHandlers = [
  http.post("/api/coverage/enrollments/query", async ({ request }) => {
    await delay(300)
    const { filters, sorting, pageIndex, pageSize } =
      (await request.json()) as EnrollmentsQueryRequest

    const filtered = applyFilters(enrollmentsDb, filters)
    const rows = applySorting(filtered, sorting)

    const totalCount = rows.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize

    return HttpResponse.json<EnrollmentsQueryResponse>({
      rows: rows.slice(start, start + pageSize),
      pageCount,
      totalCount,
    })
  }),
]
