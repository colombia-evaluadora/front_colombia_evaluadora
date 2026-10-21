import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { PreviousPeriodOption } from "../types/academic-period"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { proveedorMeta } from "@/lib/offline/query-meta"

// Candidatos a "periodo anterior" de una sede
// (`academico_test.fn_periodo_anteriores_por_sede`). El backend ya devuelve
// solo los válidos de la sede, en alcance y excluyendo el periodo en edición
// (`excludeId` → `FK_PERIODO`, null al crear uno nuevo).
interface PreviousPeriodsRequest {
  FK_SEDE: number
  FK_PERIODO: number | null
}

interface PreviousPeriodsRawResponse {
  rows: PreviousPeriodOption[]
}

export async function fetchSedePreviousPeriods(
  sedeId: string,
  excludeId?: number
): Promise<PreviousPeriodOption[]> {
  const body: PreviousPeriodsRequest = {
    FK_SEDE: Number(sedeId),
    FK_PERIODO: excludeId ?? null,
  }
  const raw = await api.query<PreviousPeriodsRawResponse>(
    "/eval-col/periodos-academicos/anterior",
    body
  )
  return raw.rows ?? []
}

export function useSedePreviousPeriodsQuery(
  sedeId: string | undefined,
  excludeId?: number
) {
  return useQuery({
    // El formulario del periodo (solo consulta sin red) lo pide al abrir.
    meta: proveedorMeta(),
    queryKey: academicPeriodKeys.academicPeriods.previousBySede(sedeId ?? "", excludeId),
    queryFn: () => fetchSedePreviousPeriods(sedeId as string, excludeId),
    enabled: !!sedeId,
  })
}
