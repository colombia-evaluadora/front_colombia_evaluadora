import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { EvidenciaInforme } from "@/features/academic-management/reports/api/types"

interface EvidenciaRow {
  pk_tactividad_soporte: number
  fk_tarchivo: number
  nombre: string | null
  urls3: string | null
  peso: number | null
  etiqueta: string | null
  fecha: string | null
  fk_tperiodo_evaluacion: number
  periodo_nombre: string | null
  fk_tactividad: number
  actividad_titulo: string | null
  observacion: string | null
  es_favorito?: boolean | null
}

function toEvidencia(row: EvidenciaRow): EvidenciaInforme {
  return {
    id: row.pk_tactividad_soporte,
    archivoId: row.fk_tarchivo,
    nombre: row.nombre,
    peso: row.peso,
    etiqueta: row.etiqueta,
    fecha: row.fecha,
    periodoId: row.fk_tperiodo_evaluacion,
    periodoNombre: row.periodo_nombre ?? "",
    actividadId: row.fk_tactividad,
    actividadTitulo: row.actividad_titulo,
    observacion: row.observacion,
    esFavorito: row.es_favorito === true,
  }
}

/** Mismo orden que el boletín (V541). */
function compararEvidencias(a: EvidenciaInforme, b: EvidenciaInforme) {
  if (a.esFavorito !== b.esFavorito) return a.esFavorito ? -1 : 1
  const porFecha = (b.fecha ?? "").localeCompare(a.fecha ?? "")
  return porFecha !== 0 ? porFecha : b.id - a.id
}

export const evidenciasInformeAllKey = ["informes", "evidencias"] as const

export interface EvidenciasInformeParams {
  matriculaId: number
  /** `null` = todo el año, que es lo que necesita la fila Final. */
  periodoId: number | null
}

export const evidenciasInformeQueryKey = (params: EvidenciasInformeParams) =>
  [...evidenciasInformeAllKey, params] as const

/**
 * `POST /informes/evidencias`. No se usa el de soportes del planeador: pide
 * gate `PLANEADOR/VER` y va por actividad, no por período.
 */
async function fetchEvidencias(params: EvidenciasInformeParams): Promise<EvidenciaInforme[]> {
  const rows = await evalCol.postRows<EvidenciaRow>("/informes/evidencias", {
    FK_TMATRICULA: params.matriculaId,
    FK_TPERIODO_EVALUACION: params.periodoId,
  })
  return rows.map(toEvidencia).sort(compararEvidencias)
}

export function useEvidenciasInformeQuery(
  params: EvidenciasInformeParams | null,
  enabled = true,
) {
  return useQuery({
    queryKey: params
      ? evidenciasInformeQueryKey(params)
      : ([...evidenciasInformeAllKey, "none"] as const),
    queryFn: () => fetchEvidencias(params!),
    enabled: enabled && params !== null,
    staleTime: 1000 * 30,
  })
}
