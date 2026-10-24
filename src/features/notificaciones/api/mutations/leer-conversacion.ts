import { api } from "@/lib/api-client"
import { NOTIFICACIONES_ENDPOINTS } from "@/features/notificaciones/api/endpoints"

/**
 * `POST /notificaciones/leer-conversacion/:canal`: los avisos de mensajes de esa conversación del
 * chat (CHAT_MENSAJE, CHAT_DIRECTO, CHAT_MENCION, CHAT_RESPUESTA, CHAT_REACCION; notification-service
 * los filtra por `datos.canal`) quedan leídos en la campana. Se llama al leer la conversación; no
 * hace falta invalidar: el servidor emite `notification.read_all` y la campana se refresca sola.
 *
 * Nunca rechaza: la conversación ya quedó leída en comms-service y un fallo acá solo deja el aviso
 * en la campana (lo mismo que antes de existir este endpoint).
 */
export async function leerNotificacionesConversacion(canal: number): Promise<void> {
  try {
    await api.post(NOTIFICACIONES_ENDPOINTS.leerConversacion(canal))
  } catch {
    // Sin efecto visible: ver arriba.
  }
}

/** Canal de un deep link del chat (`/app/comunicaciones/chat?canal=53&mensaje=9`). */
export function canalDeDeepLink(deepLink: string | null | undefined): number | null {
  const m = /[?&]canal=(\d+)/.exec(deepLink ?? "")
  return m ? Number(m[1]) : null
}
