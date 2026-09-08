/**
 * Calificaciones de una actividad. Una fila por estudiante del grupo: la
 * asistencia a la fecha de la actividad y, si es evaluativa, las notas por
 * criterio de la rúbrica.
 *
 * El porcentaje final del estudiante es la suma de sus notas por criterio
 * ponderadas por `criterio.ponderacion` (que ya está en `Actividad.rubrica`).
 * Lo que la UI muestra en la columna NOTA es ese número; "Agregar" es el
 * placeholder cuando todavía no se cargó ninguna nota.
 */

import type { Actividad, Nivel } from "@/features/planeador/api/types/actividad"

/** Estado posible de la asistencia a la fecha de la actividad. */
export type EstadoAsistencia = "asistio" | "llego-tarde" | "no-asistio"

export type Estudiante = {
  id: number
  nombres: string
  apellidos: string
}

export type Asistencia = {
  estado: EstadoAsistencia
  /** Texto libre cuando el estado es "llego-tarde" o "no-asistio". */
  justificacion?: string
  /** Adjuntos que justifican la inasistencia/llegada tarde (badge con el
   * conteo en la UI). */
  adjuntos: number
}

/** Nota del estudiante en un criterio específico. */
export type NotaCriterio = {
  criterioId: number
  /** 0-100. Sin nota hasta que se ingrese (undefined). */
  valor?: number
  /** `pk` del nivel elegido (rúbrica / escala cualitativa) — el id real que
   *  exige el backend al calificar (`PK_NIVEL`). No aplica a lista de cotejo
   *  ni a un valor numérico puro, que se resuelven solo con `valor`. */
  nivelId?: number
}

/** Calificación completa de un estudiante en una actividad. */
export type CalificacionEstudiante = Estudiante & {
  asistencia: Asistencia
  notas: NotaCriterio[]
}

/** Un criterio de rúbrica, ítem de lista de cotejo, o el único "ítem
 *  sintético" de una escala de valoración / instrumento personalizado —
 *  todo lo que `porcentajeFinal` necesita para ponderar es `id`+`ponderacion`. */
export interface ItemPonderable {
  id: number
  ponderacion: number
  label: string
}

/** Porcentaje final del estudiante: suma ponderada de sus notas por ítem
 * ponderable (criterio de rúbrica, ítem de lista de cotejo, o el ítem
 * sintético de una escala/personalizado — ver `itemsPonderables`).
 * Devuelve `null` si todavía no se cargó ninguna nota. */
export function porcentajeFinal(
  notas: NotaCriterio[],
  items: Pick<ItemPonderable, "id" | "ponderacion">[],
): number | null {
  const totalPond = items.reduce((acc, c) => acc + c.ponderacion, 0)
  if (totalPond === 0) return null

  const filled = notas.filter((n) => typeof n.valor === "number")
  if (filled.length === 0) return null

  // Pondera solo los ítems con nota cargada (la ausencia de nota pesa 0).
  // Coincide con lo que muestra la tabla: si el docente no calificó un
  // ítem, ese ítem todavía no aporta al porcentaje.
  const suma = filled.reduce((acc, n) => {
    const c = items.find((c) => c.id === n.criterioId)
    if (!c) return acc
    return acc + ((n.valor ?? 0) * c.ponderacion) / 100
  }, 0)

  // Normaliza contra la suma de los pesos efectivamente calificados, no
  // contra el total — así, si solo se cargaron 2 de 3 ítems del 30%,
  // el 100% del estudiante refleja esos dos, no los tres.
  const sumaPond = filled.reduce((acc, n) => {
    const c = items.find((c) => c.id === n.criterioId)
    return c ? acc + c.ponderacion : acc
  }, 0)

  if (sumaPond === 0) return null
  return Math.round((suma * 100) / sumaPond)
}

/** Único ítem "sintético" para instrumentos sin múltiples criterios propios
 *  (escala de valoración, personalizado sin método delegado): pondera 100%
 *  contra un solo `NotaCriterio` con `criterioId: 0`. */
const ITEM_SINTETICO: ItemPonderable[] = [{ id: 0, ponderacion: 100, label: "" }]

/**
 * Qué lista de ítems pondera una actividad, según su instrumento — mismo
 * criterio que `InstrumentoEvaluacionSection` en `form-editar-actividad.tsx`:
 * `"Lista de cotejo"` → sus ítems, `"Escala de valoración"` → un ítem
 * sintético (la escala no tiene múltiples criterios propios), `"Otro"` →
 * delega al `metodoValoracion` declarado (un instrumento a medida se valora
 * siguiendo la lógica de uno de los tres estándar) o cae al ítem sintético
 * si no se declaró ninguno, y cualquier otro valor (incluida "Rúbrica")
 * pondera contra los criterios de la rúbrica.
 */
export function itemsPonderables(actividad: Actividad): ItemPonderable[] {
  if (actividad.instrumento === "Lista de cotejo") {
    return actividad.listaCotejo.items.map((item) => ({
      id: item.id,
      ponderacion: item.ponderacion ?? 0,
      label: item.descripcion,
    }))
  }
  if (actividad.instrumento === "Escala de valoración") {
    return ITEM_SINTETICO
  }
  if (actividad.instrumento === "Otro") {
    const metodo = actividad.instrumentoPersonalizado.metodoValoracion
    if (metodo === "Lista de cotejo") {
      return actividad.listaCotejo.items.map((item) => ({
        id: item.id,
        ponderacion: item.ponderacion ?? 0,
        label: item.descripcion,
      }))
    }
    if (metodo === "Escala de valoración") {
      return ITEM_SINTETICO
    }
    if (metodo !== "Rúbrica") {
      return ITEM_SINTETICO
    }
    // metodo === "Rúbrica": cae al branch de rúbrica de abajo.
  }
  return actividad.rubrica.criterios.map((criterio) => ({
    id: criterio.id,
    ponderacion: criterio.ponderacion,
    label: criterio.nombre,
  }))
}

/** Un nivel elegible para un criterio de rúbrica o de escala cualitativa,
 *  con el valor (0-100) que aporta si se elige — mismo campo que ya carga
 *  el form de autoría (`Nivel.ponderacion`/`Criterio.excelentePonderacion`,
 *  pensado justo para esto: "peso del nivel... cuando la actividad es
 *  sumativa"), reusado acá para resolver qué número guarda seleccionar un
 *  nivel al calificar. */
export interface NivelElegible {
  label: string
  valor: number
}

export function nivelesDe(criterio: {
  excelente?: string
  excelentePonderacion?: number
  niveles: Nivel[]
}): NivelElegible[] {
  const niveles: NivelElegible[] = []
  if (criterio.excelente !== undefined) {
    niveles.push({ label: "Excelente", valor: criterio.excelentePonderacion ?? 100 })
  }
  for (const nivel of criterio.niveles) {
    niveles.push({ label: nivel.nombre, valor: nivel.ponderacion ?? 100 })
  }
  return niveles
}

/**
 * Nota definitiva de un estudiante: promedio ponderado del porcentaje que
 * sacó en cada actividad sumativa (`esEvaluativa`), pesado por
 * `actividad.ponderacion` — mismo criterio de normalización que
 * `porcentajeFinal` (una actividad sin nota cargada no pesa 0, se ignora).
 * `null` si el estudiante no tiene notas en ninguna actividad sumativa.
 */
export function notaDefinitiva(
  entries: { actividad: Actividad; notas: NotaCriterio[] }[],
): number | null {
  let suma = 0
  let sumaPond = 0
  for (const { actividad, notas } of entries) {
    if (!actividad.esEvaluativa || actividad.ponderacion <= 0) continue
    const porcentaje = porcentajeFinal(notas, itemsPonderables(actividad))
    if (porcentaje === null) continue
    suma += (porcentaje * actividad.ponderacion) / 100
    sumaPond += actividad.ponderacion
  }
  if (sumaPond === 0) return null
  return Math.round((suma * 100) / sumaPond)
}

/** El sistema escolar colombiano califica de 1.0 a 5.0 (3.0 aprueba) — la
 *  Planilla muestra ahí en vez del "%" que usan las vistas por actividad. */
export function notaEnEscalaCinco(porcentaje: number): number {
  return 1 + (porcentaje / 100) * 4
}

export const NOTA_MINIMA_APROBATORIA = 3.0