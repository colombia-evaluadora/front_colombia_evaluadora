/**
 * Contrato de suscripciones Web Push con `notification-service`
 * (`openspec/changes/add-notificaciones-push-webpush/design.md` §Contrato,
 * PLAN-comunicaciones §11):
 *
 *   GET    /notificaciones/push/suscripciones          → dispositivos del usuario
 *   POST   /notificaciones/push/suscripciones          → alta (upsert por endpoint)
 *   DELETE /notificaciones/push/suscripciones          → baja de ESTE navegador { endpoint }
 *   DELETE /notificaciones/push/suscripciones/{id}     → baja de otro dispositivo
 *
 * El backend acepta un `endpoint` repetido reasignándolo al usuario actual
 * (D-4.4). La clave pública VAPID sale del build (`VITE_APP_VAPID_PUBLIC_KEY`),
 * no de `GET /notificaciones/push/vapid-public-key`, para que el botón se
 * pueda ocultar sin red.
 */
import { api } from "@/lib/api-client"

export const PUSH_SUSCRIPCIONES_PATH = "/notificaciones/push/suscripciones"

/** Fila tal como la devuelve el backend. */
export interface PushSuscripcionRow {
  id: number
  endpoint: string
  user_agent: string | null
  plataforma: string | null
  creada_en: string
  ultimo_uso: string | null
}

export interface PushSuscripcion {
  id: number
  endpoint: string
  userAgent: string
  plataforma: string
  creadaEn: string
  ultimoUso: string | null
}

export interface PushSuscripcionInput {
  endpoint: string
  keys: { p256dh: string; auth: string }
  userAgent: string
  plataforma: string
}

export const toPushSuscripcion = (row: PushSuscripcionRow): PushSuscripcion => ({
  id: row.id,
  endpoint: row.endpoint,
  userAgent: row.user_agent ?? "",
  plataforma: row.plataforma ?? "Otro",
  creadaEn: row.creada_en,
  ultimoUso: row.ultimo_uso ?? null,
})

export async function fetchPushSuscripciones(): Promise<PushSuscripcion[]> {
  const body = await api.get<PushSuscripcionRow[] | { rows: PushSuscripcionRow[] }>(
    PUSH_SUSCRIPCIONES_PATH,
  )
  const rows = Array.isArray(body) ? body : (body?.rows ?? [])
  return rows.map(toPushSuscripcion)
}

export function postPushSuscripcion(input: PushSuscripcionInput) {
  return api.post<PushSuscripcionRow>(PUSH_SUSCRIPCIONES_PATH, input)
}

export function deletePushSuscripcionPorEndpoint(endpoint: string) {
  return api.delete<void>(PUSH_SUSCRIPCIONES_PATH, { data: { endpoint } })
}

export function deletePushSuscripcion(id: number) {
  return api.delete<void>(`${PUSH_SUSCRIPCIONES_PATH}/${id}`)
}
