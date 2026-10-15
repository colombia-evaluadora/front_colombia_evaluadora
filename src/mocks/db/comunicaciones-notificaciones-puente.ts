import { USUARIO_ACTUAL } from "@/mocks/db/comunicaciones"
import {
  registrarSinkNotificacionesChat,
  type TipoNotificacionChat,
} from "@/mocks/db/comunicaciones-notificaciones"
import { notificacionesDb } from "@/mocks/db/notificaciones"

/**
 * Puente MSW chat → bandeja de notificaciones (`src/mocks/db/notificaciones`,
 * mock del centro de notificaciones). Solo inserta en la DB del mock; no
 * depende de nada de `features/notificaciones`. En real esto lo hará
 * `comms-service` publicando a `notification-service`.
 *
 * El mock del chat tiene un único usuario real (`USUARIO_ACTUAL`): solo sus
 * notificaciones entran a la bandeja; las del resto quedan en el outbox.
 */
const TIPO_BANDEJA: Record<TipoNotificacionChat, string> = {
  MENCION: "CHAT_MENCION",
  DIRECTO: "CHAT_DM",
  RESPUESTA: "CHAT_RESPUESTA",
}

registrarSinkNotificacionesChat((n) => {
  if (n.destinatarioId !== USUARIO_ACTUAL.id) return
  notificacionesDb.unshift({
    id: `chat-${n.id}`,
    tipo: TIPO_BANDEJA[n.tipo],
    categoria: "CHAT",
    titulo: n.titulo,
    cuerpo_corto: n.cuerpo,
    deep_link: n.url,
    prioridad: n.tipo === "MENCION" ? "ALTA" : "NORMAL",
    creada_en: n.fecha,
    leida_en: null,
    actores: [n.autor],
    conteo: null,
    archivada: false,
  })
})
