import type { Conversacion } from "@/features/comunicaciones/chat/api/types"

/** Conversaciones que muestra la campana. */
export const RECIENTES_CAMPANA = 8

/**
 * Orden de la pestaña "Mensajes": no leídas primero y, dentro de cada grupo, la de mensaje más
 * reciente. Sin archivadas.
 */
export function conversacionesCampana(lista: readonly Conversacion[], max = RECIENTES_CAMPANA): Conversacion[] {
  const fecha = (c: Conversacion) => c.ultimoMensaje?.enviadoEn ?? ""
  return lista
    .filter((c) => !c.archivada)
    .sort((a, b) => Number(b.noLeidos > 0) - Number(a.noLeidos > 0) || fecha(b).localeCompare(fecha(a)))
    .slice(0, max)
}

/** Mensajes sin leer para la pestaña (sin archivadas ni silenciadas). */
export function noLeidosCampana(lista: readonly Conversacion[] | undefined): number {
  return (lista ?? [])
    .filter((c) => !c.archivada && !c.silenciadoHasta)
    .reduce((s, c) => s + c.noLeidos, 0)
}
