import type { FilaInforme } from "@/features/academic-management/reports/api/types"

/**
 * Marcas de período por estudiante: con varios períodos a la vista, cada
 * estudiante seleccionado puede llevar un check en sus filas de la columna
 * "Pe" para decir a qué períodos aplica la acción (boletín o guardar), sin
 * tener que quitar los demás períodos del filtro. Se guardan como
 * `"matrícula:período"` en un `Set`.
 */
export type MarcasPeriodo = Set<string>

export function marcaKey(matriculaId: number, periodoId: number): string {
  return `${matriculaId}:${periodoId}`
}

/** Solo un período real admite marca: el Final se calcula al vuelo (no se
 *  consolida ni tiene boletín) y las filas "requerido" son períodos que
 *  todavía no tienen notas. */
export function filaMarcable(fila: FilaInforme): boolean {
  return fila.modoPeriodo === "real"
}

export interface ObjetivoPeriodo {
  matriculaId: number
  periodoId: number
}

/**
 * Qué hacer con un estudiante seleccionado SIN marcas:
 * - `todos`: todos sus períodos reales a la vista (guardar, como siempre).
 * - `unico`: su único período real a la vista; con varios es ambiguo y el
 *   estudiante queda en `sinPeriodo` (un boletín es de un solo período).
 */
export type PorDefecto = "todos" | "unico"

export interface ObjetivosResueltos {
  objetivos: ObjetivoPeriodo[]
  /** Seleccionados a los que no se les pudo decidir el período. */
  sinPeriodo: number[]
}

/**
 * Resuelve a qué (estudiante, período) aplica una acción. Recorre `filas`
 * (los datos SIN filtrar del grupo: un seleccionado puede estar oculto por el
 * buscador) en su orden, así que los objetivos salen en el orden de la tabla.
 * Las marcas de períodos que ya no están a la vista se ignoran.
 */
export function resolverObjetivos(
  filas: FilaInforme[],
  seleccionados: Set<number>,
  marcas: MarcasPeriodo,
  porDefecto: PorDefecto,
): ObjetivosResueltos {
  const realesPorMatricula = new Map<number, number[]>()
  for (const fila of filas) {
    if (!seleccionados.has(fila.matriculaId) || !filaMarcable(fila)) continue
    const reales = realesPorMatricula.get(fila.matriculaId) ?? []
    if (!reales.includes(fila.periodoId)) reales.push(fila.periodoId)
    realesPorMatricula.set(fila.matriculaId, reales)
  }

  const objetivos: ObjetivoPeriodo[] = []
  const sinPeriodo: number[] = []
  for (const [matriculaId, reales] of realesPorMatricula) {
    const marcados = reales.filter((periodoId) => marcas.has(marcaKey(matriculaId, periodoId)))
    const periodos =
      marcados.length > 0
        ? marcados
        : porDefecto === "todos" || reales.length === 1
          ? reales
          : null
    if (periodos == null) {
      sinPeriodo.push(matriculaId)
      continue
    }
    for (const periodoId of periodos) objetivos.push({ matriculaId, periodoId })
  }
  return { objetivos, sinPeriodo }
}

/** Quita las marcas de un estudiante (al deseleccionarlo). */
export function sinMarcasDe(marcas: MarcasPeriodo, matriculaId: number): MarcasPeriodo {
  const prefijo = `${matriculaId}:`
  return new Set([...marcas].filter((key) => !key.startsWith(prefijo)))
}
