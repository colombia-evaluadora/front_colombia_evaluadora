export interface AuditTable {
  slug: string
  name: string
  // Nombre de ícono en texto (mismo formato que el menú, ej. "Bank-Icon"),
  // se resuelve a un componente en el cliente — ver getNavIcon.
  icon: string
  operationsToday: number
}

export type OperationType = "INSERT" | "UPDATE" | "DELETE"

export interface TableOperation {
  id: string
  operation: OperationType
  authorName: string
  authorAvatarUrl: string | null
  authorVerified: boolean
  ip: string
  entityName: string
  entityId: string
  occurredAt: string
}

export interface TableOperationsQueryFilters {
  author?: string
  operations?: OperationType[]
  occurredFrom?: string
  occurredTo?: string
}

export interface TableOperationsQueryRequest {
  tableSlug: string
  filters: TableOperationsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface TableOperationsQueryResponse {
  rows: TableOperation[]
  pageCount: number
  totalCount: number
}
