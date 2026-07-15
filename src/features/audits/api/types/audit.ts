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
