import type { Conversacion } from "@/features/comunicaciones/chat/api/types"

/**
 * Comunicado institucional que la persona recibió (no lo publicó). Un comunicado no es un foro: quien lo
 * recibe no "sale" de él, lo quita de su bandeja (Comunicaciones §4.3). Salir lo sacaba del canal y bajaba
 * Destinatarios y Leídos del listado de gestión (QA testv2).
 */
export const esComunicadoRecibido = (c: Pick<Conversacion, "categoria" | "esCreador">) =>
  c.categoria === "ANUNCIO" && !c.esCreador

/**
 * Acciones de salida del menú ⁞ de la conversación:
 * - `eliminarDeBandeja`: mensajería (sin el bot) y comunicados recibidos (M.2.RET.2). comms-service
 *   valida lo mismo en `PATCH /conversaciones/{id}/ocultar`.
 * - `salir`: "del grupo" o "del foro"; nunca en un comunicado (ni para quien lo recibe ni para quien lo
 *   gestiona: su ciclo es publicar, cancelar o anular).
 */
export function accionesBandeja(c: Pick<Conversacion, "tipo" | "categoria" | "esCreador" | "esBot">) {
  const eliminarDeBandeja = (c.categoria === "GENERAL" && !c.esBot) || esComunicadoRecibido(c)
  const salir =
    c.categoria === "ANUNCIO" ? null : c.tipo === "GRUPO" ? "del grupo" : c.tipo === "CANAL" ? "del foro" : null
  return { eliminarDeBandeja, salir } as const
}
