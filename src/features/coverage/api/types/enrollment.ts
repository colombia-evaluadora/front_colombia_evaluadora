import type {
  EducationLevel,
  ReservationGroupBy,
  Shift,
} from "@/features/coverage/api/types/reservation"

export type EnrollmentStatus = "sin_asignar_cupo" | "cupo_asignado"

export interface Enrollment {
  id: string

  // ── Datos del estudiante ────────────────────────────────────────────────────
  documentType: string
  documentNumber: string
  firstName: string
  secondName: string
  lastName: string
  secondLastName: string
  birthDate: string
  gender: string
  email: string
  phone: string
  residence: string
  address: string
  /** Sede y jornada a la que aspira -- lo que la tabla lista como "Sede"/"Jornada". */
  campus: string
  grade: number
  group: string
  shift: string
  enrollmentDate: string
  status: EnrollmentStatus

  // ── Datos de la institución educativa de origen ─────────────────────────────
  originInstitution: string
  originEmail: string
  originShift: string
  originEducationLevel: string

  // ── Datos del acudiente ──────────────────────────────────────────────────────
  guardianDocumentType: string
  guardianDocumentNumber: string
  guardianFirstName: string
  guardianSecondName: string
  guardianLastName: string
  guardianSecondLastName: string
  guardianLivesWithStudent: boolean
  guardianRelationship: string
  guardianEmail: string
  guardianPhone: string
  guardianAddress: string
}

export interface EnrollmentsQueryFilters {
  firstName?: string
  lastName?: string
  documentNumber?: string
  institution?: string
  campus?: string
  grade?: number
  group?: string
  shifts?: Shift[]
  levels?: EducationLevel[]
  statuses?: EnrollmentStatus[]
  reservedFrom?: string
  reservedTo?: string
  groupBy?: ReservationGroupBy
}

export interface EnrollmentsQueryRequest {
  filters: EnrollmentsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface EnrollmentsQueryResponse {
  rows: Enrollment[]
  pageCount: number
  totalCount: number
}
