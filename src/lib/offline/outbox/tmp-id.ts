/**
 * Ids temporales `tmp:<uuid>` (Fase 3, `docs/offline/PLAN-offline.md` §6.5).
 *
 * Sin dependencias a propósito: lo importa `api-client.ts` para el guard que
 * impide que un `tmp:` llegue al backend, y un import de la outbox desde ahí
 * armaría un ciclo.
 */
export const TMP_PREFIX = "tmp:"

export type TmpId = `tmp:${string}`

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
const TMP_RE = new RegExp(`tmp:${UUID}`, "i")

export function newTmpId(): TmpId {
  return `${TMP_PREFIX}${crypto.randomUUID()}` as TmpId
}

export function isTmpId(value: unknown): value is TmpId {
  return typeof value === "string" && value.startsWith(TMP_PREFIX)
}

/**
 * ¿Hay un id temporal en este valor (url, string o cuerpo serializable)?
 * Solo reconoce `tmp:` seguido de un UUID: un texto del docente que diga
 * "tmp:" no dispara el guard.
 */
export function containsTmpId(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === "string") return TMP_RE.test(value)
  if (typeof FormData !== "undefined" && value instanceof FormData) {
    for (const [, v] of value.entries()) if (typeof v === "string" && TMP_RE.test(v)) return true
    return false
  }
  if (typeof value !== "object") return false
  try {
    return TMP_RE.test(JSON.stringify(value))
  } catch {
    return false
  }
}

export class TmpIdLeakError extends Error {
  constructor() {
    super("Este cambio depende de otro que todavía no se guardó en el servidor.")
    this.name = "TmpIdLeakError"
  }
}

/** Guard del cliente HTTP: una request con un `tmp:` nunca sale (§6.5). */
export function assertNoTmpIds(config: { url?: string; data?: unknown; params?: unknown }) {
  if (containsTmpId(config.url) || containsTmpId(config.data) || containsTmpId(config.params)) {
    throw new TmpIdLeakError()
  }
}
