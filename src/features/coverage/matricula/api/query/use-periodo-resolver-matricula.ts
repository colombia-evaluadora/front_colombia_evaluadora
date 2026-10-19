import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"

interface ResolverMatriculaPeriodoRow {
  periodo_id: number | null
}

interface ResolverMatriculaPeriodoResponse {
  rows: ResolverMatriculaPeriodoRow[]
}

export async function fetchPeriodoResolverMatricula(
  sedeId: number,
  jornadaId: number,
): Promise<number | null> {
  const raw: ResolverMatriculaPeriodoResponse = await api.query(
    "/eval-col/periodos/resolver-matricula",
    { FK_SEDE: sedeId, FK_TLV_JORNADA: jornadaId },
  )
  return raw.rows?.[0]?.periodo_id ?? null
}

export function usePeriodoResolverMatriculaQuery(
  sedeId: number | null,
  jornadaId: number | null,
) {
  return useQuery({
    queryKey: matriculaKeys.periodoResolver(sedeId, jornadaId),
    queryFn: () => fetchPeriodoResolverMatricula(sedeId as number, jornadaId as number),
    enabled: sedeId != null && jornadaId != null,
  })
}
