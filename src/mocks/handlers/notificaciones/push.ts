import { delay, http, HttpResponse } from "msw"

import type {
  PushSuscripcionInput,
  PushSuscripcionRow,
} from "@/features/notificaciones/push/api/push-api"
import { pushSuscripciones } from "@/mocks/db/notificaciones/push"

/**
 * Suscripciones Web Push (`features/notificaciones/push/api/push-api.ts`).
 * En `dev` (MSW) el SW no se registra, así que el alta real casi nunca llega;
 * los handlers sirven para la lista de dispositivos y los tests.
 */
const BASE = "/api/notificaciones/push/suscripciones"

const nextId = () => pushSuscripciones.reduce((max, s) => Math.max(max, s.id), 0) + 1

export const pushHandlers = [
  http.get(BASE, async () => {
    await delay(200)
    return HttpResponse.json(pushSuscripciones)
  }),

  http.post(BASE, async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as PushSuscripcionInput
    if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return HttpResponse.json({ message: "Suscripción inválida" }, { status: 400 })
    }
    // Upsert por endpoint (D-4.4: un endpoint repetido se reasigna).
    const existing = pushSuscripciones.find((s) => s.endpoint === body.endpoint)
    if (existing) {
      existing.ultimo_uso = new Date().toISOString()
      return HttpResponse.json(existing)
    }
    const row: PushSuscripcionRow = {
      id: nextId(),
      endpoint: body.endpoint,
      user_agent: body.userAgent ?? null,
      plataforma: body.plataforma ?? null,
      creada_en: new Date().toISOString(),
      ultimo_uso: null,
    }
    pushSuscripciones.push(row)
    return HttpResponse.json(row, { status: 201 })
  }),

  // Estática (por endpoint) antes que `/:id`: MSW usa el primer match.
  http.delete(BASE, async ({ request }) => {
    await delay(100)
    const body = (await request.json().catch(() => null)) as { endpoint?: string } | null
    const index = pushSuscripciones.findIndex((s) => s.endpoint === body?.endpoint)
    if (index >= 0) pushSuscripciones.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.delete(`${BASE}/:id`, async ({ params }) => {
    await delay(100)
    const index = pushSuscripciones.findIndex((s) => s.id === Number(params.id))
    if (index < 0) return HttpResponse.json({ message: "No encontrada" }, { status: 404 })
    pushSuscripciones.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
