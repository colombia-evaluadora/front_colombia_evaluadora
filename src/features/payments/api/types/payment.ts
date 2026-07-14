export type PaymentStatus = "pending" | "processing" | "success" | "failed"

export interface Payment {
  id: string
  email: string
  status: PaymentStatus
  amount: number
  createdAt: string
}

export interface PaymentsQueryFilters {
  email?: string
  status?: PaymentStatus[]
  amountMin?: number
  amountMax?: number
}

export interface PaymentsQueryRequest {
  filters: PaymentsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface PaymentsQueryResponse {
  rows: Payment[]
  pageCount: number
  totalCount: number
}

export interface MutationResult {
  status: "ok" | "error"
  message: string
}
