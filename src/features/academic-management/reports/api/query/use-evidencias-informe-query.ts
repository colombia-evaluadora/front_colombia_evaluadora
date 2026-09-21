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
  }
}

export interface EvidenciasInformeParams {
  matriculaId: number
  /** `null` = todo el año, que es lo que necesita la fila Final. */
  periodoId: number | null
}

export const evidenciasInformeQueryKey = (params: EvidenciasInformeParams) =>
  ["informes", "evidencias", params] as const

/**
 * `POST /informes/evidencias`. Las imágenes adjuntas a las observaciones de un
 * estudiante en un período.
 *
 * No se reutiliza `GET /planeador/actividades/estudiantes/:ID/soportes`, que
 * lee la misma tabla, por dos motivos independientes: su gate es
 * `PLANEADOR/VER` —quien mira informes puede no tener planeador y se comería
 * un 403 en una pantalla donde sí puede ver— y se pide por actividad, así que
 * serían N llamadas y habría que saber de antemano qué actividades hay.
 */
async function fetchEvidencias(params: EvidenciasInformeParams): Promise<EvidenciaInforme[]> {
  const rows = await evalCol.postRows<EvidenciaRow>("/informes/evidencias", {
    FK_TMATRICULA: params.matriculaId,
    FK_TPERIODO_EVALUACION: params.periodoId,
  })
  return rows.map(toEvidencia)
}

export function useEvidenciasInformeQuery(
  params: EvidenciasInformeParams | null,
  enabled = true,
) {
  return useQuery({
    queryKey: params
      ? evidenciasInformeQueryKey(params)
      : (["informes", "evidencias", "none"] as const),
    queryFn: () => fetchEvidencias(params!),
    enabled: enabled && params !== null,
    staleTime: 1000 * 30,
  })
}
