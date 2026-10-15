import type { PushSuscripcionRow } from "@/features/notificaciones/push/api/push-api"

/** Suscripciones Web Push en memoria (recargar resetea). */
export const pushSuscripciones: PushSuscripcionRow[] = [
  {
    id: 1,
    endpoint: "https://push.example.invalid/mock-android",
    user_agent: "Mozilla/5.0 (Linux; Android 14) Chrome/128",
    plataforma: "Android",
    creada_en: "2026-09-01T13:00:00.000Z",
    ultimo_uso: "2026-10-10T15:30:00.000Z",
  },
]
