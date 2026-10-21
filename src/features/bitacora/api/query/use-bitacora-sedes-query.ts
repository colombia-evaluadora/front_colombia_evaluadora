import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"

import { bitacoraKeys } from "@/features/bitacora/api/query-keys"

interface SedeRow {
  pk_sede?: number
  id?: number
  nombre?: string
  name?: string
  fk_establecimiento?: number
}

export interface BitacoraSede {
  id: number
  nombre: string
  /** Sin dato (mock), la sede no se filtra por establecimiento. */
  establecimientoId: number | null
}

// Mismo endpoint que el selector de sedes, conservando `fk_establecimiento`.
async function fetchSedes(): Promise<BitacoraSede[]> {
  const response = await api.get<RowsEnvelope<SedeRow> | SedeRow[]>(
    apiPath("/establishments/campuses/options", "/establecimientos/sedes/opciones"),
  )
  const rows = env.ENABLE_API_MOCKING ? ((response as RowsEnvelope<SedeRow>).rows ?? []) : unwrapRows(response)
  return rows.map((r) => ({
    id: r.pk_sede ?? r.id ?? 0,
    nombre: r.nombre ?? r.name ?? "",
    establecimientoId: r.fk_establecimiento ?? null,
  }))
}

/** Sedes del establecimiento elegido (las del alcance del usuario si no hay uno). */
export function useBitacoraSedesQuery(establecimiento: string) {
  return useQuery({
    queryKey: bitacoraKeys.sedes(),
    queryFn: fetchSedes,
    staleTime: 5 * 60_000,
    select: (sedes) =>
      establecimiento
        ? sedes.filter((s) => s.establecimientoId == null || String(s.establecimientoId) === establecimiento)
        : sedes,
  })
}
