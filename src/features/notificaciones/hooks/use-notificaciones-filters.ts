import { notificacionesRoute } from "@/router"

import { notificacionesSearchSchema } from "@/features/notificaciones/api/schema"
import type { NotificacionesFiltros } from "@/features/notificaciones/api/types"
import type { NotificacionesQueryFilters } from "@/features/notificaciones/components/search/query-syntax"

/** Filtros de `/app/notificaciones` en la URL (`?categoria&estado&texto`). */
export function useNotificacionesFilters() {
  const search = notificacionesRoute.useSearch()
  const navigate = notificacionesRoute.useNavigate()

  const filters: NotificacionesQueryFilters = {
    texto: search.texto ?? "",
    categoria: search.categoria ?? "",
    estado: search.estado ?? "",
  }

  const queryFilters: NotificacionesFiltros = {
    categoria: search.categoria,
    estado: search.estado,
    texto: search.texto,
  }

  const applyFilters = (next: NotificacionesQueryFilters) => {
    // Pasa por el schema: un valor que no es del catálogo se descarta.
    const parsed = notificacionesSearchSchema.parse({
      texto: next.texto || undefined,
      categoria: next.categoria || undefined,
      estado: next.estado || undefined,
    })
    void navigate({ search: parsed, replace: true })
  }

  const clearAllFilters = () => void navigate({ search: {}, replace: true })

  const activeFilterCount = [search.categoria, search.estado].filter(Boolean).length

  return { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount }
}
