export type EducationLevel = "PREESCOLAR" | "BASICA_PRIMARIA" | "BASICA_SECUNDARIA" | "MEDIA"

export type Shift = "MANANA" | "TARDE" | "UNICA" | "COMPLETA" | "NOCTURNA"

export type ReservationStatus = "confirmada" | "pendiente" | "vencida"

// Criterio de agrupación del listado ("Agrupar por" en los filtros). No
// cambia el conjunto de filas, solo el orden: el backend agrupa las filas
// que comparten valor en esa dimensión antes de paginar.
export type ReservationGroupBy =
  | "institution"
  | "campus"
  | "grade"
  | "group"
  | "shift"
  | "educationLevel"

export interface Reservation {
  id: string
  /** Número de identificación del estudiante (columna "ID" de la tabla). */
  documentNumber: string
  firstName: string
  lastName: string
  institution: string
  campus: string
  /** 0 = transición … 11 = once. Se muestra como "3°". */
  grade: number
  group: string
  shift: Shift
  educationLevel: EducationLevel
  reservedAt: string
  status: ReservationStatus
}

export interface ReservationsQueryFilters {
  firstName?: string
  lastName?: string
  documentNumber?: string
  institution?: string
  campus?: string
  grade?: number
  group?: string
  shifts?: Shift[]
  levels?: EducationLevel[]
  statuses?: ReservationStatus[]
  reservedFrom?: string
  reservedTo?: string
  groupBy?: ReservationGroupBy
}

export interface ReservationsQueryRequest {
  filters: ReservationsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface ReservationsQueryResponse {
  rows: Reservation[]
  pageCount: number
  totalCount: number
}

// Mismo contrato que auditoría: con selección se calcula sobre `ids`, sin
// selección sobre lo que matchea los filtros activos.
export interface ReservationsStatsRequest {
  ids?: string[]
  filters?: ReservationsQueryFilters
}

export interface ReservationsStats {
  /** Reservas dentro del alcance (selección o filtros). */
  total: number
  confirmed: number
  pending: number
  expired: number
  /** Cupos ofertados por las sedes del alcance — base del % de cobertura. */
  offeredSeats: number
  byLevel: { key: EducationLevel; count: number }[]
  byShift: { key: Shift; count: number }[]
}

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}

export interface CreateReservationInput {
  documentNumber: string
  firstName: string
  lastName: string
  institution: string
  campus: string
  grade: number
  group: string
  shift: Shift
  educationLevel: EducationLevel
}

/** Catálogos para poblar los selects de filtros y del formulario de reserva. */
export interface ReservationCatalogs {
  institutions: string[]
  campuses: string[]
  groups: string[]
  grades: number[]
}
