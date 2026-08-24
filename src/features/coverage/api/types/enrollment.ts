import type { ReservationsQueryFilters } from "@/features/coverage/api/types/reservation"

export type EnrollmentStatus = "recibida" | "en_revision" | "aceptada" | "rechazada"

export interface Enrollment {
  id: string
  documentNumber: string
  firstName: string
  lastName: string
  campus: string
  grade: number
  group: string
  shift: string
  enrollmentDate: string
  status: EnrollmentStatus
}

export interface EnrollmentsQueryRequest {
  filters: ReservationsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface EnrollmentsQueryResponse {
  rows: Enrollment[]
  pageCount: number
  totalCount: number
}
