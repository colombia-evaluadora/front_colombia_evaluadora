import { USUARIO_ACTUAL } from "@/mocks/db/comunicaciones"
import {
  registrarSinkNotificacionesChat,
  type TipoNotificacionChat,
} from "@/mocks/db/comunicaciones-notificaciones"
import { notificacionesDb } from "@/mocks/db/notificaciones"
import { eleccionCerrada, elecciones } from "@/mocks/db/comunicaciones-elecciones"

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

/**
 * Elección abierta → aviso "entra a votar" en la bandeja general. Reemplaza a
 * la antigua campana propia del chat (se unificaron las dos campanas).
 */
export function notificarEleccionAbierta(conversacionId: number, nombre: string, fecha = new Date().toISOString()) {
  notificacionesDb.unshift({
    id: `chat-eleccion-${conversacionId}`,
    tipo: "CHAT_ELECCION",
    categoria: "CHAT",
    titulo: `Elección abierta: ${nombre}`,
    cuerpo_corto: "Entra al canal para votar.",
    deep_link: `/app/comunicaciones/chat?canal=${conversacionId}`,
    prioridad: "ALTA",
    creada_en: fecha,
    leida_en: null,
    actores: null,
    conteo: null,
    archivada: false,
  })
}

// Las elecciones abiertas del fixture también avisan (antes lo hacía la campana del chat).
for (const e of elecciones) {
  if (!eleccionCerrada(e)) notificarEleccionAbierta(e.conversacionId, e.nombre, e.fechaInicio ?? undefined)
}

/** Actividad nueva (encuesta, evaluación…) → aviso en la bandeja general, como comms-service. */
export function notificarActividad(conversacionId: number, tipo: string, titulo: string, cuerpo: string) {
  notificacionesDb.unshift({
    id: `chat-actividad-${conversacionId}`,
    tipo,
    categoria: "CHAT",
    titulo,
    cuerpo_corto: cuerpo,
    deep_link: `/app/comunicaciones/chat?canal=${conversacionId}`,
    prioridad: "NORMAL",
    creada_en: new Date().toISOString(),
    leida_en: null,
    actores: null,
    conteo: null,
    archivada: false,
  })
}
