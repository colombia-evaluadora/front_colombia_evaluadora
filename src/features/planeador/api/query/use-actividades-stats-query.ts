import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { ActividadStatus } from "@/features/planeador/api/types/actividad"
import {
  paresToQueryParam,
  type ActividadTabPair,
} from "@/features/planeador/api/query/use-actividades-tabs-query"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

/**
 * `GET /planeador/actividades/stats` (V250, ver colección Postman
 * `planeador-pantalla-principal`) — contadores del docente autenticado
 * (resuelto del token, no hay parámetro de funcionario) para las 4 cards de
 * resumen. Se usan los alias que ya trae la fila para el front
 * (`pending`/`in_progress`/`completed`/`cancelled`) en vez de la
 * nomenclatura de dominio (`pendientes_por_evaluar`/…) que la misma fila
 * también trae — no hace falta mapear nada.
 */
interface ActividadesStatsRow {
  pending: number
  in_progress: number
  completed: number
  cancelled: number
}

export type ActividadesStatsCounts = Record<ActividadStatus, number>

export interface UseActividadesStatsParams {
  /** Pestaña de Rótulo de Ejecución activa (ver `use-actividades-mias-query.ts`)
   *  — sin esto las 4 tarjetas sumaban todos los rótulos del docente y no
   *  cambiaban al moverse entre pestañas. */
  gradoAsignaturaPares?: ActividadTabPair[]
}

async function fetchActividadesStats(
  params: UseActividadesStatsParams,
): Promise<ActividadesStatsCounts> {
  const query = new URLSearchParams()
  if (params.gradoAsignaturaPares && params.gradoAsignaturaPares.length > 0) {
    query.set("grado_asignatura_pares", paresToQueryParam(params.gradoAsignaturaPares))
  }
  const qs = query.toString()
  const rows = await evalCol.getRows<ActividadesStatsRow>(
    `/planeador/actividades/stats${qs ? `?${qs}` : ""}`,
  )
  const row = rows[0]
  return {
    pending: row?.pending ?? 0,
    "in-progress": row?.in_progress ?? 0,
    completed: row?.completed ?? 0,
    cancelled: row?.cancelled ?? 0,
  }
}

export function useActividadesStatsQuery(params: UseActividadesStatsParams = {}) {
  return useQuery({
    queryKey: planeadorKeys.actividades.stats(params),
    queryFn: () => fetchActividadesStats(params),
    staleTime: 1000 * 30,
  })
}
