import { proveedorMeta } from "@/lib/offline/query-meta"
import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"

import type { EstablishmentOption } from "@/features/establishment/campuses/api/types/campus"
import { establishmentKeys } from "@/features/establishment/institution/api/query-keys"

interface EstablishmentsOptionsResult {
  rows: EstablishmentOption[]
}

// El SSO ya envuelve en `{ rows }` igual que el mock: no usa `unwrapRows`.
export function fetchEstablishmentsOptions(): Promise<EstablishmentsOptionsResult> {
  return api.get(apiPath("/establishments/options", "/establecimientos/opciones"))
}

/** Todos los EE activos sin paginar, para el selector del alta de sedes. */
export function useEstablishmentsOptionsQuery(enabled = true) {
  return useQuery({
    queryKey: establishmentKeys.options(),
    meta: proveedorMeta(),
    queryFn: fetchEstablishmentsOptions,
    select: (result) => result.rows,
    enabled,
    // Crear/editar/eliminar EE invalidan `establishmentKeys.all`.
    staleTime: 1000 * 60 * 5,
  })
}
