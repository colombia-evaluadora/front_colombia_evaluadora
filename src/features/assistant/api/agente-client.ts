import { api, getAuthToken, getErrorMessage } from "@/lib/api-client"
import { env } from "@/config/env"

import type {
  ConversacionDetalle,
  ConversacionResumen,
  EstadoTurno,
  MensajeRequest,
  RespuestaAgente,
} from "@/features/assistant/api/types"
import { leerSse } from "@/features/assistant/lib/sse"

// ai-control-service detrás del gateway (`/api/ai/**`, StripPrefix=1). Mismo
// path con mocks y sin mocks: el handler MSW reproduce el contrato real.
export const AGENTE_PATH = "/ai/agente"

/**
 * Error del agente con el estado HTTP. Los del streaming llegan como evento
 * `error` con `{status, mensaje}`; los previos al turno (400 texto vacío o
 * largo, 403 sin identidad, 409 conversación archivada) como HTTP normal.
 */
export class AgenteError extends Error {
  readonly status: number
  /** Segundos de `Retry-After` en un 429. */
  readonly reintentarEn: number | null

  constructor(status: number, mensaje: string, reintentarEn: number | null = null) {
    super(mensaje)
    this.name = "AgenteError"
    this.status = status
    this.reintentarEn = reintentarEn
  }
}

/** Mensaje legible de cualquier error del asistente (axios, fetch o SSE). */
export function mensajeErrorAgente(error: unknown): string {
  if (error instanceof AgenteError) return error.message
  return getErrorMessage(error)
}

export async function crearConversacion(): Promise<string> {
  const { conversationId } = await api.post<{ conversationId: string }>(`${AGENTE_PATH}/conversaciones`)
  return conversationId
}

export function listarConversaciones(page = 0, size = 20): Promise<ConversacionResumen[]> {
  return api.get<ConversacionResumen[]>(`${AGENTE_PATH}/conversaciones`, { params: { page, size } })
}

export function obtenerConversacion(id: string): Promise<ConversacionDetalle> {
  return api.get<ConversacionDetalle>(`${AGENTE_PATH}/conversaciones/${id}`)
}

/** No hay borrado en el backend: archivar la saca del listado. */
export async function archivarConversacion(id: string): Promise<void> {
  await api.put(`${AGENTE_PATH}/conversaciones/${id}/archivar`)
}

export function confirmarAccion(id: string): Promise<RespuestaAgente> {
  return api.post<RespuestaAgente>(`${AGENTE_PATH}/acciones/${id}/confirmar`)
}

export function cancelarAccion(id: string): Promise<RespuestaAgente> {
  return api.post<RespuestaAgente>(`${AGENTE_PATH}/acciones/${id}/cancelar`)
}

interface StreamOptions {
  signal?: AbortSignal
  onEstado?: (estado: EstadoTurno) => void
}

async function postStream(conversacionId: string, body: MensajeRequest, signal?: AbortSignal) {
  const token = getAuthToken()
  return fetch(`${env.API_URL}${AGENTE_PATH}/conversaciones/${conversacionId}/mensajes/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    credentials: "same-origin",
    signal,
  })
}

async function errorDeRespuesta(res: Response): Promise<AgenteError> {
  let mensaje = ""
  try {
    const cuerpo = (await res.json()) as { mensaje?: string; message?: string }
    mensaje = cuerpo.mensaje ?? cuerpo.message ?? ""
  } catch {
    // Cuerpo vacío o HTML del gateway: se usa el genérico.
  }
  const retry = Number(res.headers.get("Retry-After"))
  return new AgenteError(
    res.status,
    mensaje || "No se pudo completar la operación.",
    Number.isFinite(retry) && retry > 0 ? retry : null,
  )
}

/**
 * Turno por Server-Sent Events (`POST .../mensajes/stream`). Emite `estado`
 * mientras avanza y termina con `respuesta` (la misma `Respuesta` del
 * endpoint síncrono) o `error`. El backend NO emite texto parcial del modelo:
 * el "streaming" es de estados, la respuesta llega entera al final.
 *
 * Abortar la señal cierra la conexión, pero el turno sigue en el servidor y
 * queda en el historial (no hay endpoint para cancelarlo).
 */
export async function enviarMensajeStream(
  conversacionId: string,
  body: MensajeRequest,
  { signal, onEstado }: StreamOptions = {},
): Promise<RespuestaAgente> {
  let res = await postStream(conversacionId, body, signal)
  if (res.status === 401) {
    // El token en memoria venció: `getUser` hace `/auth/refresh` (cookie) y
    // deja el nuevo token en `api-client`. Un solo reintento.
    const { getUser } = await import("@/lib/auth")
    if (await getUser()) res = await postStream(conversacionId, body, signal)
  }
  if (!res.ok || !res.body) throw await errorDeRespuesta(res)

  for await (const { evento, datos } of leerSse(res.body)) {
    if (evento === "estado") {
      const { estado } = JSON.parse(datos) as { estado: EstadoTurno }
      onEstado?.(estado)
    } else if (evento === "respuesta") {
      return JSON.parse(datos) as RespuestaAgente
    } else if (evento === "error") {
      const { status, mensaje } = JSON.parse(datos) as { status: number; mensaje: string }
      throw new AgenteError(status, mensaje)
    }
  }
  throw new AgenteError(502, "La respuesta del asistente se cortó. Intenta de nuevo.")
}
