import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { campusKeys } from "@/features/establishment/campuses/api/query-keys"
import type { EstablishmentOption } from "@/features/establishment/campuses/api/types/campus"

/**
 * Establecimientos donde el usuario puede crear sedes
 * (`GET /establecimientos/sedes/establecimientos-disponibles`, sso V449): el
 * selector de Nueva sede. Usa el mismo permiso que el alta, así que no ofrece un
 * EE que al guardar se rechace. Las demás pantallas siguen con
 * `useEstablishmentsOptionsQuery` (todos los EE que el usuario ve).
 */
export async function fetchEstablishmentsForCampus(): Promise<EstablishmentOption[]> {
  const rows = await evalCol.getRows<{ id: number; name: string }>("/establecimientos/sedes/establecimientos-disponibles")
  return rows.map((row) => ({ id: Number(row.id), name: row.name }))
}

export function useEstablishmentsForCampusQuery(enabled = true) {
  return useQuery({
    queryKey: campusKeys.establecimientosDisponibles(),
    queryFn: fetchEstablishmentsForCampus,
    enabled,
  })
}
