/**
 * Espera antes del reintento `attempt` (0-based): exponencial con tope y
 * "equal jitter" (la mitad fija, la otra mitad al azar). El azar evita la
 * estampida de reconexiones cuando un redeploy cierra todos los sockets a la
 * vez (Risks de `add-tiempo-real-gateway/design.md`).
 */
export const BACKOFF_BASE_MS = 1_000
export const BACKOFF_MAX_MS = 30_000

export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const exp = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt))
  return Math.round(exp / 2 + random() * (exp / 2))
}
