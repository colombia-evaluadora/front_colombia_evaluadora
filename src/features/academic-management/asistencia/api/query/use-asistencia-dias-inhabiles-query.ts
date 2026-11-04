import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { TTL_OFFLINE, offlineMeta } from "@/lib/offline/query-meta"
import { asistenciaKeys } from "@/features/academic-management/asistencia/api/query-keys"

export type TipoDiaInhabil = "FESTIVO" | "SUSPENSION" | "VACACIONES"

interface DiaInhabilRow {
  fecha: string
  fk_tperiodo_academico: number
  fk_tlv_jornada: number | null
  jornada: string | null
  tipo: TipoDiaInhabil
  motivo: string | null
}

export interface DiaInhabil {
  fecha: string
  jornada: string | null
  tipo: TipoDiaInhabil
  motivo: string | null
}

export interface DiasInhabilesParams {
  SEDE: number
  ANIO: number
  MES: number
}

const toDiaInhabil = (row: DiaInhabilRow): DiaInhabil => ({
  fecha: row.fecha.slice(0, 10),
  jornada: row.jornada,
  tipo: row.tipo,
  motivo: row.motivo,
})

/** Días inhábiles del Calendario Académico (Regla 108) de la sede en el mes:
 *  festivos, suspensiones y vacaciones, uno por día y período (jornada). El
 *  calendario de asistencia ya no proyecta clases en ellos (V457); esto solo
 *  da el motivo para pintarlos deshabilitados (V542.1). */
async function fetchDiasInhabiles(params: DiasInhabilesParams): Promise<DiaInhabil[]> {
  const raw = await api.get<{ rows: DiaInhabilRow[] } | DiaInhabilRow[]>(
    "/eval-col/asistencias/dias-inhabiles",
    { params },
  )
  const rows = Array.isArray(raw) ? raw : (raw.rows ?? [])
  return rows.map(toDiaInhabil)
}

export function useAsistenciaDiasInhabilesQuery(params: DiasInhabilesParams, enabled = true) {
  return useQuery({
    meta: offlineMeta(TTL_OFFLINE.grupo),
    queryKey: asistenciaKeys.diasInhabiles(params),
    queryFn: () => fetchDiasInhabiles(params),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export const TIPO_DIA_INHABIL_LABEL: Record<TipoDiaInhabil, string> = {
  FESTIVO: "Festivo",
  SUSPENSION: "Suspensión",
  VACACIONES: "Vacaciones",
}
