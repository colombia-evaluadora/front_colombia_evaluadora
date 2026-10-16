import { env } from "@/config/env"

/**
 * Duración máxima offline (`openspec/changes/add-offline-meses-pwa`, D-2).
 * Un solo número gobierna la sesión offline, la ventana de la outbox, el
 * snapshot del menú y la retención de queries persistidas: si no estuvieran
 * alineados, el docente podría seguir capturando notas que ya no tiene cómo
 * enviar, o perder el roster antes de que venza su sesión.
 */
const DAY_MS = 864e5

export const OFFLINE_MAX_DAYS = env.OFFLINE_MAX_DAYS
export const OFFLINE_MAX_MS = OFFLINE_MAX_DAYS * DAY_MS

/** Aviso temprano: 14 días antes del vencimiento (o al 85% si la ventana es corta). */
export const OFFLINE_WARN_MS = Math.max(OFFLINE_MAX_MS - 14 * DAY_MS, Math.round(OFFLINE_MAX_MS * 0.85))
