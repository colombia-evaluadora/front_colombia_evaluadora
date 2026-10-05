export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
  /** `X-Report-Rows` del reporting-service, cuando vino. */
  filas?: number
}
