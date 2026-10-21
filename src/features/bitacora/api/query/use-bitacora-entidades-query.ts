import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX } from "@/lib/api-routes"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"

import { ENTIDADES_MOCK } from "@/features/bitacora/api/mock-bitacora"
import { bitacoraKeys } from "@/features/bitacora/api/query-keys"
import type { BitacoraEntidad, BitacoraModulo } from "@/features/bitacora/api/types/bitacora"

async function fetchEntidades(modulo: BitacoraModulo): Promise<BitacoraEntidad[]> {
  if (env.ENABLE_API_MOCKING) return ENTIDADES_MOCK[modulo]
  const response = await api.get<RowsEnvelope<BitacoraEntidad>>(`${AUDIT_API_PREFIX}/bitacora/entidades/${modulo}`)
  return unwrapRows(response)
}

/** Entidades del módulo con eventos, para el filtro Entidad. */
export function useBitacoraEntidadesQuery(modulo: BitacoraModulo) {
  return useQuery({
    queryKey: bitacoraKeys.entidades(modulo),
    queryFn: () => fetchEntidades(modulo),
    staleTime: 5 * 60_000,
  })
}
