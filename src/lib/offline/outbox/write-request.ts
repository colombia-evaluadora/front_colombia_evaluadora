/**
 * Contrato mínimo entre las funciones de escritura de los features y la
 * outbox (Fase 3, sagas del planeador). Cada función de mutación acepta un
 * `WriteRequest` opcional al final: online no se pasa nada (mismo
 * comportamiento de siempre) y desde un paso de la saga se pasa la
 * `Idempotency-Key` FIJA del paso (§6.3: el reintento no duplica) y
 * `background` (sin toasts globales).
 */
import type { AxiosRequestConfig } from "axios"

export interface WriteRequest {
  headers?: Record<string, string>
  background?: boolean
  /**
   * Archivos de un paso encolado. Un material/adaptación con
   * `url`/`blobUrl` = `outbox-file:<clave>` se resuelve acá (blob guardado
   * en el store `blobs`) en vez de `fetch(blob:)`, que no sobrevive a una
   * recarga.
   */
  files?: StepFiles
}

export interface StepFiles {
  get(key: string): Promise<File>
  /**
   * Sube una sola vez por clave: si un reintento vuelve a armar el PUT de
   * reemplazo total, reutiliza el `pk_tarchivo` ya subido (si no, el body
   * cambia y el gateway responde 422 por reuso de la clave).
   */
  memo(key: string, upload: () => Promise<number>): Promise<number>
}

export const OUTBOX_FILE_PREFIX = "outbox-file:"

export function isOutboxFileRef(url: string | undefined | null): url is string {
  return typeof url === "string" && url.startsWith(OUTBOX_FILE_PREFIX)
}

export function outboxFileKey(url: string): string {
  return url.slice(OUTBOX_FILE_PREFIX.length)
}

/** Config de axios para la escritura (nada si es el envío online de siempre). */
export function writeConfig(req?: WriteRequest): AxiosRequestConfig | undefined {
  if (!req) return undefined
  return { headers: req.headers, background: req.background }
}

/** Blob de un adjunto: del store de la outbox o del `blob:` vivo del formulario. */
export async function resolveUploadFile(url: string, nombre: string, req?: WriteRequest): Promise<File> {
  if (isOutboxFileRef(url)) {
    if (!req?.files) throw new Error("El archivo de este cambio ya no está disponible en el equipo.")
    return req.files.get(outboxFileKey(url))
  }
  const blob = await fetch(url).then((r) => r.blob())
  return new File([blob], nombre, { type: blob.type })
}
