export type SessionStatus = "active" | "closed"

export interface AuditSession {
  id: string
  authorName: string
  authorAvatarUrl: string | null
  authorVerified: boolean
  ip: string
  startedAt: string
  endedAt: string | null
  status: SessionStatus
  operationsCount: number
}

export interface AuditsQueryFilters {
  author?: string
  status?: SessionStatus[]
  startedFrom?: string
  startedTo?: string
}

export interface AuditsQueryRequest {
  filters: AuditsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface AuditsQueryResponse {
  rows: AuditSession[]
  pageCount: number
  totalCount: number
}

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}

// Igual que exportar: se calcula sobre lo seleccionado (`ids`) o, si no hay
// selección, sobre lo que coincide con los filtros activos (`filters`).
export interface AuditsStatsRequest {
  ids?: string[]
  filters?: AuditsQueryFilters
}

export interface AuditsStats {
  sessionsToday: number
  activeSessions: number
  operationsToday: number
}
