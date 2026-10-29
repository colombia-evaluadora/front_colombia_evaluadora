import type { UnidadColega } from "@/features/planeador/api/query/use-unidad-colegas-query"

/**
 * Regla 27: qué muestra el paso "ceder" del diálogo de eliminar unidad según
 * los colegas que la usan (`GET /planeador/unidades/:id/colegas`).
 *
 * Solo cuentan los colegas con funcionario activo (`funcionarioId`): un autor
 * que no lo es (carga masiva, funcionario inactivo) no puede recibir la
 * unidad, y por eso tampoco obliga a cederla: el backend
 * (`fn_unidad_validar_eliminable`) solo exige ceder si hay al menos un
 * cesionario válido.
 * - `sin-colegas`: nadie a quien cederla → la cesión no aplica y se sigue el
 *   flujo del dueño solo (Reglas 38/39); las actividades de otros autores se
 *   desvinculan, nunca se borran.
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

/** Actividades de autores ajenos que NO son cesionarios (sin funcionario
 *  activo): al eliminar la unidad se desvinculan, nunca se borran. */
export function actividadesAjenasSinCesion(colegas: readonly UnidadColega[]): number {
  return colegas.filter((c) => c.funcionarioId == null).reduce((total, c) => total + c.actividades, 0)
}

/** Minúsculas sin tildes ni espacios sobrantes, para comparar búsquedas. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Buscador del paso "ceder": filtra en el front porque la lista son solo los
 * colegas que usan UNA unidad (siempre corta). Coincide por nombre — todas
 * las palabras, en cualquier orden y sin importar tildes — o por documento
 * (solo dígitos; admite puntos, guiones o espacios en lo tecleado).
 */
export function filtrarColegas<T extends Pick<UnidadColega, "nombre" | "identificacion">>(
  colegas: readonly T[],
  busqueda: string,
): T[] {
  const termino = normalizar(busqueda)
  if (!termino) return [...colegas]
  const palabras = termino.split(" ")
  const esDocumento = /^[\d.\-\s]+$/.test(termino)
  const digitos = termino.replace(/\D/g, "")
  return colegas.filter((c) => {
    if (palabras.every((p) => normalizar(c.nombre).includes(p))) return true
    return esDocumento && digitos.length > 0 && (c.identificacion ?? "").replace(/\D/g, "").includes(digitos)
  })
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
