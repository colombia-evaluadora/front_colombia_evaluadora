import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

import { useAuth } from "@/features/auth/hooks/use-auth"
import { evalCol } from "@/lib/eval-col-client"
import { TTL_OFFLINE, offlineMeta } from "@/lib/offline/query-meta"
import { realtimeEnabled } from "@/lib/realtime"
import type { Conversacion, Mensaje } from "@/features/comunicaciones/chat/api/types"
import { personalizarMensajes } from "@/features/comunicaciones/chat/lib/personalizar-mensaje"
import { forosKeys } from "@/features/comunicaciones/foros/api/query-keys"
import type { Foro, Publicacion, PublicacionesParams } from "@/features/comunicaciones/foros/api/types"
import { personalizarPublicacion } from "@/features/comunicaciones/foros/lib/foros"

/**
 * Lecturas de los foros (`comms-service`, `foro/ForoController.java`). Todas se
 * persisten para consulta sin conexión (`meta.offline`, TTL de detalle): el
 * docente puede releer las publicaciones ya abiertas en el aula; escribir
 * necesita red (`useOnlineOnly` en cada acción).
 */

export const PUBLICACIONES_POR_PAGINA = 30

// Sin tiempo real, polling (como el chat).
const refetchInterval = realtimeEnabled ? false : 30_000

/** Canales FORO del usuario: los mismos de `/conversaciones`, filtrados. */
export async function fetchForos(): Promise<Conversacion[]> {
  return (await evalCol.getRows<Conversacion>("/comunicaciones/conversaciones")).filter((c) => c.tipo === "FORO")
}

export function useForosQuery() {
  return useQuery({
    queryKey: forosKeys.lista,
    queryFn: fetchForos,
    meta: offlineMeta(TTL_OFFLINE.detalle),
    refetchInterval,
  })
}

export function useForoQuery(foroId: number | undefined) {
  return useQuery({
    queryKey: forosKeys.cabecera(foroId ?? "none"),
    queryFn: () => evalCol.getRow<Foro>(`/comunicaciones/foros/${foroId}`),
    enabled: Boolean(foroId),
    meta: offlineMeta(TTL_OFFLINE.detalle),
  })
}

export function publicacionesQs(p: PublicacionesParams, pagina: number) {
  const qs = new URLSearchParams({ orden: p.orden, pagina: String(pagina), limite: String(PUBLICACIONES_POR_PAGINA) })
  if (p.etiqueta) qs.set("etiqueta", String(p.etiqueta))
  if (p.q) qs.set("q", p.q)
  return qs.toString()
}

/** Listado paginado ("Cargar más"): `totalCount` viene repetido en cada fila. */
export function usePublicacionesQuery(params: PublicacionesParams | null) {
  const { user } = useAuth()
  const userId = user?.userId
  return useInfiniteQuery({
    queryKey: params ? forosKeys.publicaciones(params) : forosKeys.publicacionesDe("none"),
    queryFn: ({ pageParam }) =>
      evalCol.getRows<Publicacion>(
        `/comunicaciones/foros/${params?.foroId}/publicaciones?${publicacionesQs(params as PublicacionesParams, pageParam)}`,
      ),
    initialPageParam: 0,
    getNextPageParam: (ultima, paginas) => {
      const total = ultima[0]?.totalCount ?? 0
      const cargadas = paginas.reduce((n, p) => n + p.length, 0)
      return ultima.length === PUBLICACIONES_POR_PAGINA && cargadas < total ? paginas.length : undefined
    },
    enabled: Boolean(params?.foroId),
    placeholderData: (prev) => prev,
    select: (data) => data.pages.flat().map((p) => personalizarPublicacion(p, userId)),
    meta: offlineMeta(TTL_OFFLINE.detalle),
    refetchInterval,
  })
}

export function usePublicacionQuery(id: number | undefined) {
  const { user } = useAuth()
  const userId = user?.userId
  return useQuery({
    queryKey: forosKeys.publicacion(id ?? "none"),
    queryFn: () => evalCol.getRow<Publicacion>(`/comunicaciones/foros/publicaciones/${id}`),
    enabled: Boolean(id),
    select: (p) => personalizarPublicacion(p, userId),
    meta: offlineMeta(TTL_OFFLINE.detalle),
  })
}

export function useRespuestasQuery(publicacionId: number | undefined) {
  const { user } = useAuth()
  const userId = user?.userId
  return useQuery({
    queryKey: forosKeys.respuestas(publicacionId ?? "none"),
    queryFn: () => evalCol.getRows<Mensaje>(`/comunicaciones/foros/publicaciones/${publicacionId}/respuestas`),
    enabled: Boolean(publicacionId),
    select: (ms) => personalizarMensajes(ms, userId),
    meta: offlineMeta(TTL_OFFLINE.detalle),
    refetchInterval,
  })
}
