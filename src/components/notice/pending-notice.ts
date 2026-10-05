import type { NoticeVariant } from "@/components/notice/notice-banner"

export interface NotifyOptions {
  variant?: NoticeVariant
  autoCloseMs?: number
}

export interface PendingNotice {
  message: string
  options?: NotifyOptions
}

/**
 * Aviso encolado para el `NoticeProvider` que monte a continuación.
 *
 * Existe para el patrón "guardar y navegar" (crear/editar actividad o
 * unidad, guardar la configuración de campos de matrícula: `onSuccess` →
 * `navigate(...)`): un `notify()` normal ahí actualiza el estado del
 * `NoticeProvider` de la pantalla que se está por DESMONTAR, así que el
 * aviso nunca llega a pintarse. `queueNotice` lo guarda para que el
 * `NoticeProvider` de la pantalla de DESTINO lo muestre apenas se monta.
 *
 * No es estado de React a propósito: tiene que sobrevivir al desmontaje del
 * provider que lo encola (es una SPA, no hay reload entre rutas). Por eso
 * vive en este store mínimo con un ciclo de vida explícito —`set` al
 * encolar, `take` (leer y vaciar en una sola operación) al consumirlo,
 * `reset` para tests— en lugar de una variable suelta leída y escrita desde
 * varios lugares.
 *
 * Se consume UNA sola vez: `take` lo vacía, así que si dos providers montan
 * a la vez (StrictMode re-invoca el efecto, o dos pantallas se solapan un
 * instante durante la navegación) solo el primero lo muestra.
 */
export function createPendingNoticeStore() {
  let pending: PendingNotice | null = null
  return {
    set(notice: PendingNotice) {
      pending = notice
    },
    /** Devuelve el aviso encolado (o `null`) y lo vacía. */
    take(): PendingNotice | null {
      const queued = pending
      pending = null
      return queued
    },
    /** Descarta el aviso encolado sin mostrarlo (tests). */
    reset() {
      pending = null
    },
  }
}

export const pendingNoticeStore = createPendingNoticeStore()
