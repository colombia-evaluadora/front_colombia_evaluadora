/**
 * Coordinación del refresh de sesión entre pestañas.
 *
 * auth-center rota el refresh token en cada `POST /auth/refresh` y tiene
 * detección de reuso: si llegan dos refresh con la MISMA cookie, el primero
 * rota y los demás reciben `401 refresh_token_reuse` — y el servidor revoca la
 * sesión entera. En QA (acudiente en testv2) tres 403 en paralelo pedían tres
 * refresh a la vez y la persona quedaba deslogueada en un par de minutos.
 *
 * Dentro de la pestaña, el single-flight vive en `api-client.ts`
 * (`refreshAccessToken`). Acá está lo que cruza pestañas, que comparten la
 * cookie `sso_refresh`:
 * - `withCrossTabLock`: Web Locks serializa los refresh de todas las pestañas
 *   del mismo origen. La que espera ya manda la cookie rotada por la anterior.
 * - `publishRefreshedToken` / `takeRecentSharedToken`: la pestaña que rotó
 *   difunde el access token por `BroadcastChannel`; la que estaba esperando el
 *   lock lo reusa si es reciente en vez de rotar otra vez enseguida.
 *
 * Todo degrada sin error si el navegador no tiene alguna de las dos APIs (o
 * en node, en los tests): queda solo el single-flight de la pestaña.
 */

const CHANNEL_NAME = "ceval:auth-refresh"

interface RefreshedMessage {
  type: "refreshed"
  token: string | null
  at: number
}

let sharedToken: { token: string; at: number } | null = null

function createChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channel.addEventListener("message", (event: MessageEvent<RefreshedMessage>) => {
      const data = event.data
      if (data?.type !== "refreshed") return
      sharedToken = data.token ? { token: data.token, at: data.at } : null
    })
    // En node un canal abierto mantiene vivo el proceso (tests).
    ;(channel as BroadcastChannel & { unref?: () => void }).unref?.()
    return channel
  } catch {
    return null
  }
}

const channel = createChannel()

/**
 * Corre `fn` con un lock exclusivo entre pestañas. Sin Web Locks, la corre
 * directo (single-flight de la pestaña nada más).
 */
export async function withCrossTabLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined
  if (!locks?.request) return fn()
  return locks.request(name, { mode: "exclusive" }, fn) as Promise<T>
}

/** Difunde el access token recién emitido (`null` al cerrar sesión). */
export function publishRefreshedToken(token: string | null): void {
  const at = Date.now()
  // La pestaña que publica no recibe su propio mensaje: no se guarda acá a sí
  // misma (su token ya está en memoria en `api-client`).
  try {
    channel?.postMessage({ type: "refreshed", token, at } satisfies RefreshedMessage)
  } catch {
    // Canal cerrado: no hay con quién compartir.
  }
}

/**
 * El token que otra pestaña rotó hace menos de `maxAgeMs`, o `null`. Se
 * consume: lo usa una sola espera (la siguiente que pida, si ya pasó la
 * ventana, rota de verdad).
 */
export function takeRecentSharedToken(maxAgeMs: number, now: number = Date.now()): string | null {
  const shared = sharedToken
  if (!shared || now - shared.at > maxAgeMs) return null
  sharedToken = null
  return shared.token
}

/** Solo tests. */
export function __setSharedTokenForTests(value: { token: string; at: number } | null): void {
  sharedToken = value
}
