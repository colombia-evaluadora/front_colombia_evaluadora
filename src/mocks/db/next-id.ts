/**
 * Próximo id numérico para un mock db: el mayor id ya usado + 1, o `base` si
 * la colección está vacía. Mismo criterio que un PK secuencial real
 * (autoincrement de Postgres) — sin depender de un contador en memoria
 * aparte que se desincronice si el módulo se recarga.
 */
export function nextId(ids: number[], base = 1000): number {
  return ids.length ? Math.max(...ids) + 1 : base
}
