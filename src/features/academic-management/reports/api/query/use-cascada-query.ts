import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type {
  AnioInforme,
  JornadaInforme,
  SedeInforme,
} from "@/features/academic-management/reports/api/types"

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

/** `POST /informes/sedes`. Sin cuerpo a propósito: el alcance sale de quien
 *  pregunta, no del body. Solo trae sedes con período académico, así que el
 *  segundo select nunca queda vacío. */
export function useSedesInformeQuery() {
  return useQuery({
    queryKey: ["informes", "sedes"] as const,
    queryFn: async (): Promise<SedeInforme[]> => {
      const rows = await evalCol.postRows<SedeRow>("/informes/sedes", {})
      return rows.map((row) => ({
        id: row.fk_tsede,
        nombre: row.sede_nombre,
        establecimientoId: row.fk_testablecimiento,
        establecimientoNombre: row.establecimiento_nombre,
      }))
    },
    staleTime: 1000 * 60 * 10,
  })
}

/** `POST /informes/anos`. Solo el año en curso y los anteriores: los que ya
 *  están creados para 2027-2029 son configuración adelantada. */
export function useAniosInformeQuery(sedeId: number | null) {
  return useQuery({
    queryKey: ["informes", "anos", sedeId] as const,
    queryFn: async (): Promise<AnioInforme[]> => {
      const rows = await evalCol.postRows<AnioRow>("/informes/anos", { FK_TSEDE: sedeId })
      return rows.map((row) => ({ anio: row.anio, esActual: row.es_actual }))
    },
    enabled: sedeId != null,
    staleTime: 1000 * 60 * 10,
  })
}

/** `POST /informes/jornadas`. */
export function useJornadasInformeQuery(sedeId: number | null, anio: number | null) {
  return useQuery({
    queryKey: ["informes", "jornadas", sedeId, anio] as const,
    queryFn: async (): Promise<JornadaInforme[]> => {
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
    },
    enabled: sedeId != null && anio != null,
    staleTime: 1000 * 60 * 10,
  })
}
