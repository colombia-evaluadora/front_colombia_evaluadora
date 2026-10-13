import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { informeGrupoQueryKeyPrefix } from "@/features/academic-management/reports/api/query/use-informe-grupo-query"
import { planillaInformeQueryKeyPrefix } from "@/features/academic-management/reports/api/query/use-planilla-informe-query"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

interface SolicitudRow {
  pk_tsolicitud_aprobacion: number
  fk_tasignatura: number | null
  fk_tperiodo_evaluacion: number | null
}

interface ResultadoMasivo {
  resueltas: number[]
  fallidas: { id: number; codigo: string; error: string }[]
}

export interface RechazarPlanillaInput {
  grupoId: number
  asignaturaId: number
  periodoId: number
  motivo: string
}

/**
 * Rechaza las correcciones de nota pendientes (Regla 55) de una planilla:
 * `GET /aprobaciones/pendientes` filtra por grupo y acá por asignatura y
 * periodo; `POST /aprobaciones/rechazar-masivo` las resuelve en una llamada.
 */
async function rechazarPlanilla(input: RechazarPlanillaInput): Promise<{ rechazadas: number; fallidas: number }> {
  const pendientes = await evalCol.getRows<SolicitudRow>(
    `/aprobaciones/pendientes?tipo=CORRECCION_RESULTADO&grupo=${input.grupoId}`,
  )
  const ids = pendientes
    .filter((s) => s.fk_tasignatura === input.asignaturaId && s.fk_tperiodo_evaluacion === input.periodoId)
    .map((s) => s.pk_tsolicitud_aprobacion)
  if (ids.length === 0) return { rechazadas: 0, fallidas: 0 }

  const [fila] = await evalCol.postRows<{ resultado: ResultadoMasivo }>("/aprobaciones/rechazar-masivo", {
    IDS: ids,
    MOTIVO: input.motivo.trim(),
  })
  const { resueltas, fallidas } = fila?.resultado ?? { resueltas: [], fallidas: [] }
  if (resueltas.length === 0 && fallidas.length > 0) throw new Error(fallidas[0].error)
  return { rechazadas: resueltas.length, fallidas: fallidas.length }
}

export function useRechazarPlanillaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: rechazarPlanilla,
    // También con fallidas: las que pasaron ya cambiaron.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: planillaInformeQueryKeyPrefix() })
      queryClient.invalidateQueries({ queryKey: informeGrupoQueryKeyPrefix() })
      queryClient.invalidateQueries({ queryKey: ["informes", "cambios-pendientes"] })
      queryClient.invalidateQueries({ queryKey: planeadorKeys.all })
    },
  })
}
