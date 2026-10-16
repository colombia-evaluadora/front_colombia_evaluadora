import { useSyncExternalStore } from "react"

import { isOutboxEnabled } from "@/lib/offline/outbox/engine"
import { outboxStore } from "@/lib/offline/outbox/store"
import type { OutboxOp, OutboxStatus, OutboxSummary } from "@/lib/offline/outbox/types"
import { getOnlineOnlyState, type OnlineOnlyState } from "@/lib/offline/use-online-only"
import { useConnectivity } from "@/lib/offline/use-connectivity"

export function useOutboxSummary(): OutboxSummary {
  return useSyncExternalStore(outboxStore.subscribe, outboxStore.getSummary, outboxStore.getSummary)
}

export function useOutboxOps(): OutboxOp[] {
  return useSyncExternalStore(outboxStore.subscribe, outboxStore.getOps, outboxStore.getOps)
}

const PRIORITY: OutboxStatus[] = ["conflict", "rejected", "blocked", "inflight", "retry", "pending"]

/** Estado más relevante de las ops abiertas cuya `entityKey` cumple `match` (badge por ítem). */
export function pendingStatusOf(ops: OutboxOp[], match: (entityKey: string) => boolean): OutboxStatus | null {
  const statuses = new Set(ops.filter((o) => o.status !== "done" && match(o.entityKey)).map((o) => o.status))
  return PRIORITY.find((s) => statuses.has(s)) ?? null
}

export function usePendingFor(entityKey: string | null | undefined): OutboxStatus | null {
  const ops = useOutboxOps()
  if (!entityKey) return null
  return pendingStatusOf(ops, (k) => k === entityKey)
}

/**
 * Reemplaza `useOnlineOnly` en las acciones que la Fase 2 encola (asistencia
 * y planilla): con la outbox habilitada (piloto + equipo personal + modo
 * `full`) quedan activas sin red; si no, se comportan como solo en línea.
 */
export function useOfflineWritable(tooltip?: string): OnlineOnlyState & { queues: boolean } {
  const { status } = useConnectivity()
  useOutboxSummary() // re-render al cambiar el usuario/estado de la cola
  if (isOutboxEnabled()) return { disabled: false, reason: null, tooltip: null, queues: status !== "online" }
  return { ...getOnlineOnlyState(status, tooltip), queues: false }
}
