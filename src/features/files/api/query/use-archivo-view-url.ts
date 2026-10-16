import { useQuery } from "@tanstack/react-query"

import { fetchArchivoViewUrl, type ArchivoViewToken } from "@/lib/files"
import { getCachedArchivoUrl } from "@/lib/offline/file-cache"

/** El backend acuña tokens de vista de 5 minutos (`ViewTokenService`). */
const TOKEN_TTL_MS = 5 * 60 * 1000

/** Margen para renovar ANTES de que expire y no mostrar una imagen rota. */
const REFRESH_MARGIN_MS = 60 * 1000

export const archivoViewUrlQueryKey = (archivoId: number | null | undefined) => [
  "archivo-view-url",
  archivoId,
]

/**
 * Pide el token de vista; si falla (sin red) y el archivo se guardó con
 * "Preparar → Incluir archivos" (`lib/offline/file-cache.ts`), devuelve un
 * `blob:` local. Si tampoco está guardado, propaga el error original.
 */
async function fetchViewUrlOrCached(archivoId: number): Promise<ArchivoViewToken> {
  try {
    return await fetchArchivoViewUrl(archivoId)
  } catch (error) {
    const cached = await getCachedArchivoUrl(archivoId)
    if (cached) return { token: "", url: cached }
    throw error
  }
}

/**
 * URL lista para un `<img src>` a partir de un `pk_tarchivo`.
 *
 * El token viaja en la URL porque una etiqueta `<img>` no puede mandar
 * `Authorization`; por eso mismo es de un solo archivo y de vida corta. La
 * query se refresca sola un minuto antes de que caduque: si se dejara cachear
 * más, la imagen empezaría a fallar sin que nada lo delate.
 *
 * `networkMode: "always"`: sin red la query no queda pausada, así llega al
 * fallback del archivo guardado en el equipo.
 */
export function useArchivoViewUrl(archivoId: number | null | undefined) {
  return useQuery({
    queryKey: archivoViewUrlQueryKey(archivoId),
    queryFn: () => fetchViewUrlOrCached(archivoId as number),
    enabled: archivoId != null,
    networkMode: "always",
    staleTime: TOKEN_TTL_MS - REFRESH_MARGIN_MS,
    refetchInterval: TOKEN_TTL_MS - REFRESH_MARGIN_MS,
    select: (data) => data.url,
  })
}
