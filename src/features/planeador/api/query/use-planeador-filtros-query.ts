import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

/**
 * Cascada Sede → Año → Jornada del filtro avanzado del Planeador. Mismo
 * molde que la de Informes (`use-cascada-query.ts`), pero con endpoints
 * propios del Planeador (sso V553.1): los de Informes van con gate
 * `INFORMES/VER`, y un usuario con el Planeador pero sin el menú de Informes
 * recibiría 403. El alcance es el de las lecturas del tablero
 * (`fn_planeador_alcance_docente`): super admin todas las sedes, rector su
 * EE, coordinador sus pares sede+jornada.
 */
interface SedeRow {
  fk_tsede: number
  sede_nombre: string
  fk_testablecimiento: number
  establecimiento_nombre: string
}

interface PeriodoRow {
  fk_tperiodo_academico: number
  periodo_nombre: string | null
  anio: number
  fk_tlv_jornada: number | null
  jornada_nombre: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  en_curso: boolean
  abierto: boolean
}

export interface PlaneadorFiltroSede {
  id: number
  nombre: string
  establecimientoId: number
  establecimientoNombre: string
}

/** Una fila por periodo académico de la sede: el año y la jornada del
 *  filtro salen de acá, y su `id` es lo que viaja como `?periodo=`. */
export interface PlaneadorFiltroPeriodo {
  id: number
  nombre: string
  anio: number
  /** `null` en periodos viejos sin jornada (se muestra "Sin jornada"). */
  jornadaId: number | null
  jornadaNombre: string
  enCurso: boolean
  /** `FECHA_FIN >= hoy`: el periodo académico sigue abierto. Se decide por
   *  fecha y no por el estado del catálogo, que no se mantiene (sso V203). */
  abierto: boolean
}

export function usePlaneadorFiltroSedesQuery(enabled = true) {
  return useQuery({
    queryKey: planeadorKeys.filtros.sedes(),
    queryFn: async (): Promise<PlaneadorFiltroSede[]> => {
      const rows = await evalCol.getRows<SedeRow>("/planeador/filtros/sedes")
      return rows.map((row) => ({
        id: row.fk_tsede,
        nombre: row.sede_nombre,
        establecimientoId: row.fk_testablecimiento,
        establecimientoNombre: row.establecimiento_nombre,
      }))
    },
    enabled,
    staleTime: 1000 * 60 * 10,
  })
}

export function usePlaneadorFiltroPeriodosQuery(sedeId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: planeadorKeys.filtros.periodos(sedeId ?? "none"),
    queryFn: async (): Promise<PlaneadorFiltroPeriodo[]> => {
      const rows = await evalCol.getRows<PeriodoRow>(`/planeador/filtros/periodos?sede=${sedeId}`)
      return rows.map((row) => ({
        id: row.fk_tperiodo_academico,
        nombre: row.periodo_nombre ?? "",
        anio: row.anio,
        jornadaId: row.fk_tlv_jornada,
        jornadaNombre: row.jornada_nombre?.trim() || "Sin jornada",
        enCurso: row.en_curso,
        abierto: row.abierto,
      }))
    },
    enabled: enabled && sedeId != null,
    staleTime: 1000 * 60 * 10,
  })
}

/** Años distintos de los periodos de una sede, del más reciente al más viejo. */
export function aniosDePeriodos(periodos: PlaneadorFiltroPeriodo[]): number[] {
  return [...new Set(periodos.map((p) => p.anio))].sort((a, b) => b - a)
}

/** Año por defecto: el del periodo académico en curso; si no hay, el más
 *  reciente que siga abierto; si tampoco, el más reciente. */
export function anioPorDefecto(periodos: PlaneadorFiltroPeriodo[]): number | undefined {
  const enCurso = periodos.find((p) => p.enCurso)
  if (enCurso) return enCurso.anio
  const abiertos = periodos.filter((p) => p.abierto).map((p) => p.anio)
  if (abiertos.length > 0) return Math.max(...abiertos)
  const anios = aniosDePeriodos(periodos)
  return anios[0]
}

/** Periodos (uno por jornada) de un año. */
export function periodosDelAnio(
  periodos: PlaneadorFiltroPeriodo[],
  anio: number | undefined,
): PlaneadorFiltroPeriodo[] {
  return anio == null ? [] : periodos.filter((p) => p.anio === anio)
}

/** Jornada por defecto, como en Informes: la del periodo en curso o, si el
 *  año tiene una sola, esa. */
export function jornadaPorDefecto(delAnio: PlaneadorFiltroPeriodo[]): number | null | undefined {
  const enCurso = delAnio.find((p) => p.enCurso)
  if (enCurso) return enCurso.jornadaId
  return delAnio.length === 1 ? delAnio[0].jornadaId : undefined
}

/** Valor de URL / combobox de una jornada (`null` = periodo sin jornada). */
export const SIN_JORNADA = 0
export const jornadaKey = (jornadaId: number | null): number => jornadaId ?? SIN_JORNADA

/** Año y jornada por defecto de una sede (`?ano=&jornada=`). */
export function defaultsDeSede(periodos: PlaneadorFiltroPeriodo[]): { ano?: number; jornada?: number } {
  const ano = anioPorDefecto(periodos)
  const jornadaId = jornadaPorDefecto(periodosDelAnio(periodos, ano))
  return { ano, jornada: jornadaId === undefined ? undefined : jornadaKey(jornadaId) }
}
