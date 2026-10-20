import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type {
  AnioInforme,
  JornadaInforme,
  SedeInforme,
} from "@/features/academic-management/reports/api/types"
import { TTL_OFFLINE, offlineMeta } from "@/lib/offline/query-meta"

interface SedeRow {
  fk_tsede: number
  sede_nombre: string
  fk_testablecimiento: number
  establecimiento_nombre: string
}

interface AnioRow {
  anio: number
  es_actual: boolean
}

interface JornadaRow {
  fk_tlv_jornada: number
  jornada_nombre: string
  fk_tperiodo_academico: number
  periodo_nombre: string
  fecha_inicio: string
  fecha_fin: string
  en_curso: boolean
}

// Keys y fetchers exportados: "Preparar sin conexión" baja la cascada con las
// MISMAS keys que la pantalla (`features/offline/lib/prepare-tasks.ts`).
export const sedesInformeQueryKey = () => ["informes", "sedes"] as const
export const aniosInformeQueryKey = (sedeId: number | null) => ["informes", "anos", sedeId] as const
export const jornadasInformeQueryKey = (sedeId: number | null, anio: number | null) =>
  ["informes", "jornadas", sedeId, anio] as const

export async function fetchSedesInforme(): Promise<SedeInforme[]> {
  const rows = await evalCol.postRows<SedeRow>("/informes/sedes", {})
  return rows.map((row) => ({
    id: row.fk_tsede,
    nombre: row.sede_nombre,
    establecimientoId: row.fk_testablecimiento,
    establecimientoNombre: row.establecimiento_nombre,
  }))
}

export async function fetchAniosInforme(sedeId: number | null): Promise<AnioInforme[]> {
  const rows = await evalCol.postRows<AnioRow>("/informes/anos", { FK_TSEDE: sedeId })
  return rows.map((row) => ({ anio: row.anio, esActual: row.es_actual }))
}

export async function fetchJornadasInforme(sedeId: number | null, anio: number | null): Promise<JornadaInforme[]> {
  const rows = await evalCol.postRows<JornadaRow>("/informes/jornadas", {
    FK_TSEDE: sedeId,
    ANIO: anio,
  })
  return rows.map((row) => ({
    id: row.fk_tlv_jornada,
    nombre: row.jornada_nombre,
    periodoAcademicoId: row.fk_tperiodo_academico,
    periodoAcademicoNombre: row.periodo_nombre,
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    enCurso: row.en_curso,
  }))
}

/** `POST /informes/sedes`. Sin cuerpo a propósito: el alcance sale de quien
 *  pregunta, no del body. Solo trae sedes con período académico, así que el
 *  segundo select nunca queda vacío. */
export function useSedesInformeQuery() {
  return useQuery({
    meta: offlineMeta(TTL_OFFLINE.grupo),
    queryKey: sedesInformeQueryKey(),
    queryFn: fetchSedesInforme,
    staleTime: 1000 * 60 * 10,
  })
}

/** `POST /informes/anos`. Solo el año en curso y los anteriores: los que ya
 *  están creados para 2027-2029 son configuración adelantada. */
export function useAniosInformeQuery(sedeId: number | null) {
  return useQuery({
    meta: offlineMeta(TTL_OFFLINE.grupo),
    queryKey: aniosInformeQueryKey(sedeId),
    queryFn: () => fetchAniosInforme(sedeId),
    enabled: sedeId != null,
    staleTime: 1000 * 60 * 10,
  })
}

/** `POST /informes/jornadas`. */
export function useJornadasInformeQuery(sedeId: number | null, anio: number | null) {
  return useQuery({
    meta: offlineMeta(TTL_OFFLINE.grupo),
    queryKey: jornadasInformeQueryKey(sedeId, anio),
    queryFn: () => fetchJornadasInforme(sedeId, anio),
    enabled: sedeId != null && anio != null,
    staleTime: 1000 * 60 * 10,
  })
}
