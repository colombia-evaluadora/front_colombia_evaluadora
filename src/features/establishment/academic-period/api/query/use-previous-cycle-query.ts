import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { EnrollmentModality, PreviousPeriodOption } from "../types/academic-period"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

// Período del ciclo anterior (`fn_periodo_ciclo_anterior_buscar`, Regla 96): misma
// Sede + Año (de la fecha de inicio) + Jornada + Modalidad y Ciclo − 1. Sin filas si no
// existe o el usuario no lo alcanza; con él, el formulario ofrece copiar y generar.
export interface PreviousCycleParams {
  sedeId: string
  jornadaId: number
  startDate: string
  modality: EnrollmentModality
  cycle: number
}

interface PreviousCycleRawResponse {
  rows: PreviousPeriodOption[]
}

export async function fetchPreviousCycle(
  params: PreviousCycleParams,
): Promise<PreviousPeriodOption | null> {
  const raw = await api.query<PreviousCycleRawResponse>(
    "/eval-col/periodos-academicos/ciclo-anterior",
    {
      FK_SEDE: Number(params.sedeId),
      FK_JORNADA: params.jornadaId,
      FECHA_INICIO: params.startDate,
      MODALIDAD_MATRICULA: params.modality,
      CICLO: params.cycle,
    },
  )
  return raw.rows?.[0] ?? null
}

export function usePreviousCycleQuery(params: PreviousCycleParams, enabled: boolean) {
  // Sin los cinco datos (o en ciclo 1) no hay ciclo anterior que buscar.
  const complete =
    !!params.sedeId && !!params.jornadaId && !!params.startDate && params.cycle > 1
  return useQuery({
    queryKey: academicPeriodKeys.academicPeriods.previousCycle(params),
    queryFn: () => fetchPreviousCycle(params),
    enabled: enabled && complete,
  })
}
