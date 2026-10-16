import type { OutboxHandler } from "@/lib/offline/outbox/types"

/**
 * Handlers por `kind`, registrados desde los features (tarea 7.1: la
 * infraestructura no conoce asistencia ni planilla). `features/offline/
 * register-handlers.ts` los importa al arrancar para que una op guardada se
 * pueda enviar aunque su ruta (lazy) todavía no se haya cargado.
 */
const handlers = new Map<string, OutboxHandler<never>>()

export function registerOutboxHandler<P>(handler: OutboxHandler<P>): OutboxHandler<P> {
  handlers.set(handler.kind, handler as unknown as OutboxHandler<never>)
  return handler
}

export function getOutboxHandler<P = unknown>(kind: string): OutboxHandler<P> | undefined {
  return handlers.get(kind) as unknown as OutboxHandler<P> | undefined
}
