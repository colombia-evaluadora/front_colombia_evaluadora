import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  PreMatriculaCatalogsRequest,
  PreMatriculaCatalogsResponse,
} from "@/features/coverage/api/types/pre-matricula"

function fetchPreMatriculaCatalogs(
  body: PreMatriculaCatalogsRequest,
): Promise<PreMatriculaCatalogsResponse> {
  return api.query("/coverage/pre-matricula/catalogs", body)
}

/**
 * Catálogos de grupos por sede para el dialog de asignar cupo.
 * Solo se activa cuando el dialog está abierto (`enabled`).
 */
export function usePreMatriculaCatalogsQuery(
  params: PreMatriculaCatalogsRequest & { enabled?: boolean },
) {
  const { enabled = true, ...body } = params
  return useQuery({
    queryKey: ["pre-matricula", "catalogs", body],
    queryFn: () => fetchPreMatriculaCatalogs(body),
    enabled,
    staleTime: 30_000,
  })
}
