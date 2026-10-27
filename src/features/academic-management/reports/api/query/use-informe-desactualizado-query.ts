import { useQueries } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { PERIODO_FINAL_ID } from "@/features/academic-management/reports/api/types"
import { informeGrupoQueryKeyPrefix } from "@/features/academic-management/reports/api/query/use-informe-grupo-query"

/**
 * Texto estático de la Regla 71. Es el mismo que devuelve el backend en
 * `mensaje` (sso V496.19 `fn_informe_desactualizado_interno`); se fija aquí
 * para que el aviso no dependa de que llegue y no cambie por redacción.
 */
export const MENSAJE_INFORME_DESACTUALIZADO =
  "Este informe fue emitido antes de que se aprobara una actividad de Recuperación; los valores mostrados pueden no reflejar la Nota Final o el resultado más reciente del estudiante."

interface CambioDesactualizadoRow {
  pkSolicitud: number
  tipo: string
  asignatura: string | null
  fechaAprobacion: string | null
}

interface InformeDesactualizadoRow {
  informe: {
    desactualizado: boolean
    mensaje: string | null
    cambios: CambioDesactualizadoRow[] | null
  } | null
}

export interface CambioDesactualizado {
  solicitudId: number
  tipo: string
  /** `null` = la aprobación tocó el informe del grupo entero, no una asignatura. */
  asignatura: string | null
  fechaAprobacion: string | null
}

export interface InformeDesactualizado {
  periodoId: number
  desactualizado: boolean
  cambios: CambioDesactualizado[]
}

/** Cuelga del prefijo del listado del grupo: consolidar o guardar la planilla
 *  ya lo invalida, y el backend limpia la marca al reemitir. */
export const informeDesactualizadoQueryKey = (grupoId: number, periodoId: number) =>
  [...informeGrupoQueryKeyPrefix(), "desactualizado", { grupoId, periodoId }] as const

async function fetchInformeDesactualizado(
  grupoId: number,
  periodoId: number,
): Promise<InformeDesactualizado> {
  const query = new URLSearchParams({ grupo: String(grupoId), periodo: String(periodoId) })
  const rows = await evalCol.getRows<InformeDesactualizadoRow>(`/informes/desactualizado?${query}`)
  const informe = rows[0]?.informe
  return {
    periodoId,
    desactualizado: informe?.desactualizado === true,
    cambios: (informe?.cambios ?? []).map((c) => ({
      solicitudId: c.pkSolicitud,
      tipo: c.tipo,
      asignatura: c.asignatura ?? null,
      fechaAprobacion: c.fechaAprobacion ?? null,
    })),
  }
}

/**
 * `GET /informes/desactualizado?grupo&periodo` (sso V496.21) por cada período
 * mostrado: Regla 71, el informe ya emitido quedó viejo porque después se
 * aprobó un cambio (p. ej. una Recuperación). Solo se avisa, nunca se
 * regenera solo. El Final no es un período del calendario: no se consulta.
 */
export function useInformesDesactualizadosQuery(grupoId: number | null, periodos: number[]) {
  const reales = grupoId != null ? periodos.filter((p) => p !== PERIODO_FINAL_ID) : []
  return useQueries({
    queries: reales.map((periodoId) => ({
      // Un aviso accesorio: sin red no bloquea la pantalla.
      meta: { offlineOptional: true },
      queryKey: informeDesactualizadoQueryKey(grupoId!, periodoId),
      queryFn: () => fetchInformeDesactualizado(grupoId!, periodoId),
      staleTime: 1000 * 30,
    })),
    combine: (results) =>
      results.flatMap((r) => (r.data?.desactualizado ? [r.data] : [])),
  })
}
