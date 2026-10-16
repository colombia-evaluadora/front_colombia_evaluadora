import type { SendCtx } from "@/lib/offline/outbox/types"

/**
 * Headers de una escritura enviada por la outbox: la clave de idempotencia y,
 * si se conoce, el instante de captura (ISO-8601) para las reglas de periodo
 * cerrado del backend (`openspec/changes/add-offline-meses-pwa` D-7). Un
 * backend que no conoce el header lo ignora (compatibilidad hacia atrás).
 */
export function outboxHeaders(ctx: Pick<SendCtx, "idempotencyKey" | "capturedAt">): Record<string, string> {
  const headers: Record<string, string> = { "Idempotency-Key": ctx.idempotencyKey }
  if (ctx.capturedAt != null) headers["X-Client-Captured-At"] = new Date(ctx.capturedAt).toISOString()
  return headers
}
