/**
 * Para con una sola persona (modo Individual, QA 833): de la selección nueva queda solo la persona
 * recién agregada, que reemplaza a la anterior. Quitar el chip deja el campo vacío.
 */
export function reemplazarSeleccion<T extends { id: number }>(anterior: T[], nueva: T[]): T[] {
  if (nueva.length <= 1) return nueva
  const agregada = nueva.filter((p) => !anterior.some((a) => a.id === p.id))
  return [agregada.at(-1) ?? nueva[nueva.length - 1]]
}
