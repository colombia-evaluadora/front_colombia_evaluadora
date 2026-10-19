import { env } from "@/config/env"
import { api } from "@/lib/api-client"

// Fila por id con `status` ("eliminado" o "error:<motivo>"); el pk varía por entidad.
export type BulkDeleteEntityRow<K extends string> = Record<K, string> & { status: string }

export interface BulkDeleteEntityResult<K extends string> {
  rows: BulkDeleteEntityRow<K>[]
}

export interface BulkDeleteEntitySummary {
  succeededCount: number
  failed: { id: string; reason: string }[]
}

interface BulkDeleteConfig {
  mockUrl: string
  realUrl: string
  realMethod: "post" | "put"
}

// Real: `{ pks }` por POST/PUT; el mock espera array plano vía DELETE.
export function createBulkDeleteFn<R>({ mockUrl, realUrl, realMethod }: BulkDeleteConfig) {
  return (ids: number[]): Promise<R> => {
    if (env.ENABLE_API_MOCKING) {
      // `api.delete(url, body)` no existe en la firma estándar de axios.
      return api.request<R>({
        method: "DELETE",
        url: mockUrl,
        data: ids,
      }) as unknown as Promise<R>
    }
    return api[realMethod](realUrl, { pks: ids })
  }
}

export function summarizeEntityBulkDelete<K extends string>(
  result: BulkDeleteEntityResult<K>,
  pkKey: K
): BulkDeleteEntitySummary {
  const failed: BulkDeleteEntitySummary["failed"] = []
  let succeededCount = 0
  for (const row of result.rows) {
    if (row.status === "eliminado") {
      succeededCount += 1
    } else {
      const reason = row.status.startsWith("error:")
        ? row.status.slice("error:".length)
        : row.status
      failed.push({ id: row[pkKey], reason })
    }
  }
  return { succeededCount, failed }
}
