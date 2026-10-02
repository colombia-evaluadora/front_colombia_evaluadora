import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

/**
 * `GET /planeador/unidades/:id/actividades-disponibles` (real, colección
 * Postman `planeador-guia-completa`, 1.6) — actividades ACTIVE, sin unidad,
 * de la misma asignatura y (vía su grupo) del mismo grado que la unidad
 * `:id`. Alimenta el modal "Vincular actividad" (`DialogAgregarActividad`),
 * reemplazando el filtro client-side sobre `useActividadesQuery()` (que
 * comparaba `actividad.unidad.id === unidad.id`, un campo que ni siquiera
 * tiene sentido para una huérfana).
 *
 * Cada fila ya trae `porcentaje_disponible` calculado para esa combinación
 * (unidad, grupo de la fila) — por eso NO hace falta llamar
 * `/unidades/:id/ponderacion-disponible` (1.5) aparte para pintar
 * "Disponible para asignar: X%".
 *
 * Confirmado por lectura directa de `fn_actividad_disponibles_listar`
 * (sso V223): no trae `es_evaluativa` (eso solo lo expone
 * `fn_unidad_actividades_listar`, un endpoint distinto) — `tipo` sale de
 * `tipo_actividad` tal cual.
 */
interface ActividadDisponibleRow {
  pk_tactividad: number
  titulo: string
  tipo_actividad?: string | null
  instrumento_evaluacion?: string | null
  grupo?: string | null
  porcentaje_disponible?: number | null
}

export interface ActividadDisponible {
  id: number
  nombre: string
  tipo: string
  instrumento: string
  grupo: string
  porcentajeDisponible: number | null
}

function toActividadDisponible(row: ActividadDisponibleRow): ActividadDisponible {
  return {
    id: row.pk_tactividad,
    nombre: row.titulo,
    tipo: row.tipo_actividad ?? "",
    instrumento: row.instrumento_evaluacion ?? "",
    grupo: row.grupo ?? "",
    porcentajeDisponible: row.porcentaje_disponible ?? null,
  }
}

async function fetchActividadesDisponibles(unidadId: number, search: string): Promise<ActividadDisponible[]> {
  const query = new URLSearchParams({ size: "50", pagina: "1" })
  if (search) query.set("search", search)
  const rows = await evalCol.getRows<ActividadDisponibleRow>(
    `/planeador/unidades/${unidadId}/actividades-disponibles?${query}`,
  )
  return rows.map(toActividadDisponible)
}

export const unidadActividadesDisponiblesQueryKey = (unidadId: number, search: string) =>
  ["planeador", "unidad", unidadId, "actividades-disponibles", search] as const

export function useUnidadActividadesDisponiblesQuery(unidadId: number | undefined, search: string) {
  return useQuery({
    queryKey:
      unidadId != null
        ? unidadActividadesDisponiblesQueryKey(unidadId, search)
        : (["planeador", "unidad", "none", "actividades-disponibles", search] as const),
    queryFn: () => fetchActividadesDisponibles(unidadId!, search),
    enabled: unidadId != null,
    placeholderData: (previous) => previous,
    staleTime: 1000 * 15,
  })
}
