import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { ActividadStatus } from "@/features/planeador/api/types/actividad"

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

async function fetchActividadesStats(): Promise<ActividadesStatsCounts> {
  const rows = await evalCol.getRows<ActividadesStatsRow>("/planeador/actividades/stats")
  const row = rows[0]
  return {
    pending: row?.pending ?? 0,
    "in-progress": row?.in_progress ?? 0,
    completed: row?.completed ?? 0,
    cancelled: row?.cancelled ?? 0,
  }
}

export const actividadesStatsQueryKey = () => ["planeador", "actividades-stats"] as const

export function useActividadesStatsQuery() {
  return useQuery({
    queryKey: actividadesStatsQueryKey(),
    queryFn: fetchActividadesStats,
    staleTime: 1000 * 30,
  })
}
