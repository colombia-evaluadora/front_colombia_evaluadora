/**
 * Mensaje de éxito que da el SERVIDOR para una escritura.
 *
 * query-service lee la etiqueta de negocio que declaró la función de escritura
 * (`fn_audit_declarar` → `app.etiqueta`, p. ej. "Creación de la sede Norte") y
 * la devuelve en el header `X-Mensaje` (URL-encoded; sso V590). La misma
 * etiqueta llega a la campana como notificación `APP_ACCION` en tiempo real.
 *
 * El interceptor de `api-client` anota cada `X-Mensaje` de una escritura y
 * `notify()`/`queueNotice()` de éxito lo prefieren sobre el texto local
 * (`SUCCESS_MESSAGES` queda solo como respaldo mientras migran los endpoints
 * que aún no declaran etiqueta). Reglas para no mostrar un mensaje ajeno:
 * - caduca a los `TTL_MS` (el aviso sale justo después del `await`);
 * - se consume al usarlo;
 * - si se acumuló más de un mensaje distinto (borrado múltiple, guardado de
 *   varios pasos) se usa el texto local, que resume la operación completa.
 */
const TTL_MS = 8000

let pending: { messages: string[]; at: number } | null = null

export function noteServerMessage(header: string | undefined | null) {
  if (!header) return
  let message: string
  try {
    message = decodeURIComponent(header).trim()
  } catch {
    return
  }
  if (!message) return
  const now = Date.now()
  if (!pending || now - pending.at > TTL_MS) pending = { messages: [], at: now }
  if (!pending.messages.includes(message)) pending.messages.push(message)
  pending.at = now
}

/** Devuelve (y descarta) el mensaje del servidor pendiente, o `null`. */
export function takeServerMessage(): string | null {
  const current = pending
  pending = null
  if (!current || Date.now() - current.at > TTL_MS) return null
  return current.messages.length === 1 ? current.messages[0] : null
}

/** Texto de un aviso de éxito: el del servidor si lo hay, si no el local. */
export function resolveSuccessMessage(localMessage: string, variant: string | undefined): string {
  if (variant && variant !== "success") return localMessage
  return takeServerMessage() ?? localMessage
}
