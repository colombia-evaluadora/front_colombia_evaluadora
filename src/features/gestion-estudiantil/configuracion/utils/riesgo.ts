// Causas de inasistencia reservadas (§9.5, V698): las cuatro fijas siempre van y no se quitan.

/** La selección con las fijas siempre dentro, sin repetidos y en el orden en que llegaron. */
export function causasConFijas(seleccion: string[], fijas: string[]): string[] {
  return [...new Set([...fijas, ...seleccion])]
}

/** El PUT recibe solo las que agrega el establecimiento: las fijas las pone el backend. */
export function causasParaBackend(seleccion: string[], fijas: string[]): string[] {
  return seleccion.filter((c) => !fijas.includes(c))
}
