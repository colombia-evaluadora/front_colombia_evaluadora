import type { OutboxOp } from "@/lib/offline/outbox/types"

/**
 * Reporte del día de sincronización (`add-offline-meses-pwa` D-11). Compara
 * las ops abiertas al empezar con las de ahora: las que ya no están (o están
 * `done`) se subieron; las que quedaron en conflicto o rechazadas se listan con
 * su motivo. Nada se descarta: lo que no subió sigue en la cola.
 */
export interface SyncReportItem {
  id: string
  kind: string
  createdAt: number
  motivo: string | null
}

export interface SyncReport {
  subidos: number
  pendientes: number
  conflictos: SyncReportItem[]
  rechazados: SyncReportItem[]
}

function item(op: OutboxOp): SyncReportItem {
  return { id: op.id, kind: op.kind, createdAt: op.createdAt, motivo: op.lastError?.message ?? null }
}

export function buildSyncReport(inicio: readonly string[], ops: readonly OutboxOp[]): SyncReport {
  const byId = new Map(ops.map((op) => [op.id, op]))
  const report: SyncReport = { subidos: 0, pendientes: 0, conflictos: [], rechazados: [] }
  for (const id of inicio) {
    const op = byId.get(id)
    if (!op || op.status === "done") report.subidos++
    else if (op.status === "conflict") report.conflictos.push(item(op))
    else if (op.status === "rejected" || op.status === "blocked") report.rechazados.push(item(op))
    else report.pendientes++
  }
  return report
}
