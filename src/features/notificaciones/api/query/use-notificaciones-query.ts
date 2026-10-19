import { useInfiniteQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { offlineMeta, TTL_OFFLINE } from "@/lib/offline/query-meta"
import { NOTIFICACIONES_ENDPOINTS } from "@/features/notificaciones/api/endpoints"
import type {
  Notificacion,
  NotificacionesFiltros,
  NotificacionesPage,
  NotificacionesPageRow,
  NotificacionRow,
} from "@/features/notificaciones/api/types"
import { safeDeepLink } from "@/features/notificaciones/lib/deep-link"

/** Tamaño de página del cursor (D-2.3). La campana muestra las 10 primeras. */
export const NOTIFICACIONES_PAGE_SIZE = 30

export const toNotificacion = (row: NotificacionRow): Notificacion => ({
  id: row.id,
  tipo: row.tipo,
  categoria: row.categoria,
  titulo: row.titulo ?? "",
  cuerpo: row.cuerpo_corto ?? "",
  deepLink: safeDeepLink(row.deep_link),
  prioridad: row.prioridad ?? "NORMAL",
  creadaEn: row.creada_en,
  leida: row.leida_en != null,
  actores: row.actores ?? [],
  conteo: row.conteo ?? 1,
})

/** Normaliza filtros: claves vacías fuera, para que la key y el GET coincidan. */
export function toNotificacionesFilters(filtros: NotificacionesFiltros): NotificacionesFiltros {
  const out: NotificacionesFiltros = {}
  if (filtros.categoria) out.categoria = filtros.categoria
  if (filtros.estado) out.estado = filtros.estado
  const texto = filtros.texto?.trim()
  if (texto) out.texto = texto
  return out
}

export const notificacionesListaQueryKey = (filtros: NotificacionesFiltros) =>
  ["notificaciones", "lista", toNotificacionesFilters(filtros)] as const

export async function fetchNotificaciones(
  filtros: NotificacionesFiltros,
  cursor: string | null,
): Promise<NotificacionesPage> {
  const page = await api.get<NotificacionesPageRow>(NOTIFICACIONES_ENDPOINTS.lista(), {
    params: {
      ...toNotificacionesFilters(filtros),
      limit: NOTIFICACIONES_PAGE_SIZE,
      ...(cursor ? { cursor } : {}),
    },
  })
  return { items: (page?.items ?? []).map(toNotificacion), nextCursor: page?.next_cursor ?? null }
}

/**
 * Bandeja por cursor (D-2.3). `meta.offline` (D-2.7): la lista se persiste y
 * se puede leer sin conexión; las escrituras se deshabilitan con `useOnlineOnly`.
 * La campana usa la misma key sin filtros, así comparte cache con la página.
 */
export function useNotificacionesInfiniteQuery(
  filtros: NotificacionesFiltros = {},
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    enabled,
    queryKey: notificacionesListaQueryKey(filtros),
    queryFn: ({ pageParam }) => fetchNotificaciones(filtros, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: (prev) => prev,
    meta: offlineMeta(TTL_OFFLINE.detalle),
  })
}
