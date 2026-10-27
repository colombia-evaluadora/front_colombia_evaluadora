import type { UnidadColega } from "@/features/planeador/api/query/use-unidad-colegas-query"

/**
 * Regla 27: qué muestra el paso "ceder" del diálogo de eliminar unidad según
 * los colegas que la usan (`GET /planeador/unidades/:id/colegas`).
 *
 * Solo cuentan los colegas con funcionario: un autor que no es funcionario
 * (carga masiva) bloquea el borrado en el backend pero no puede recibir la
 * unidad, así que no se ofrece.
 * - `sin-colegas`: nadie a quien cederla (el 409 quedó viejo o solo hay
 *   autores sin funcionario).
 * - `automatica`: uno solo → se le cede a él tras confirmar, sin elegir.
 * - `elegir`: varios → el dueño elige de la lista.
 */
export type CesionUnidad =
  | { modo: "sin-colegas" }
  | { modo: "automatica"; colega: UnidadColega }
  | { modo: "elegir"; colegas: UnidadColega[] }

export function resolverCesion(colegas: readonly UnidadColega[]): CesionUnidad {
  const cedibles = colegas.filter((c) => c.funcionarioId != null)
  if (cedibles.length === 0) return { modo: "sin-colegas" }
  if (cedibles.length === 1) return { modo: "automatica", colega: cedibles[0]! }
  return { modo: "elegir", colegas: cedibles }
}

function contar(n: number, singular: string, plural: string): string | null {
  if (n <= 0) return null
  return `${n} ${n === 1 ? singular : plural}`
}

/** "2 actividades · 1 criterio" — lo que el colega tiene en la unidad. */
export function describirUsoColega(
  colega: Pick<UnidadColega, "actividades" | "criterios">,
  rotuloActividad: { singular: string; plural: string },
): string {
  return [
    contar(colega.actividades, rotuloActividad.singular, rotuloActividad.plural),
    contar(colega.criterios, "criterio", "criterios"),
  ]
    .filter(Boolean)
    .join(" · ")
}
