import { fetchArchivoViewUrl } from "@/lib/files"

/**
 * Archivos para usar sin conexión (opción "Incluir archivos" de "Preparar",
 * plan §7.9). Los `<img>` de soportes/evidencias usan URLs con token de vista
 * de 5 minutos (`useArchivoViewUrl`), que no sirven sin red ni se pueden
 * cachear por URL. Acá se guarda el CONTENIDO en Cache Storage bajo una clave
 * estable por `pk_tarchivo`, y `useArchivoViewUrl` cae a un `blob:` cuando el
 * token no se puede pedir.
 *
 * Una sola cache para el equipo: se borra entera al pasar a "compartido" y al
 * limpiar los datos de un usuario (logout / cambio de usuario), igual que las
 * filas de `ce-offline`. Nunca en modo compartido (lo decide el llamador).
 */
export const ARCHIVOS_CACHE = "ce-offline-archivos"

/** Tope por archivo: un soporte más grande no se guarda (cuota del equipo). */
export const MAX_ARCHIVO_BYTES = 5 * 1024 * 1024

const cacheKey = (archivoId: number) => `/__offline/archivo/${archivoId}`

function cachesAvailable(): boolean {
  return typeof caches !== "undefined"
}

/** Descarga y guarda un archivo. Devuelve `false` si no se guardó (sin
 *  Cache Storage, demasiado grande). Tira si falla la red. */
export async function cacheArchivo(archivoId: number): Promise<boolean> {
  if (!cachesAvailable()) return false
  const { url } = await fetchArchivoViewUrl(archivoId)
  const response = await fetch(url, { credentials: "same-origin" })
  if (!response.ok) throw new Error(`No se pudo descargar el archivo ${archivoId} (${response.status})`)
  const blob = await response.blob()
  if (blob.size > MAX_ARCHIVO_BYTES) return false
  const cache = await caches.open(ARCHIVOS_CACHE)
  await cache.put(
    cacheKey(archivoId),
    new Response(blob, { headers: { "Content-Type": blob.type || "application/octet-stream" } }),
  )
  return true
}

const objectUrls = new Map<number, string>()

/** `blob:` del archivo guardado, o `null` si no está en el equipo. */
export async function getCachedArchivoUrl(archivoId: number): Promise<string | null> {
  if (!cachesAvailable()) return null
  const existing = objectUrls.get(archivoId)
  if (existing) return existing
  try {
    const cache = await caches.open(ARCHIVOS_CACHE)
    const response = await cache.match(cacheKey(archivoId))
    if (!response) return null
    const url = URL.createObjectURL(await response.blob())
    objectUrls.set(archivoId, url)
    return url
  } catch {
    return null
  }
}

export async function clearArchivosCache(): Promise<void> {
  for (const url of objectUrls.values()) URL.revokeObjectURL(url)
  objectUrls.clear()
  if (!cachesAvailable()) return
  await caches.delete(ARCHIVOS_CACHE).catch(() => false)
}
