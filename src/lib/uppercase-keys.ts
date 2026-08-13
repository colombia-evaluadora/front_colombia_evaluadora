/**
 * Convierte recursivamente las keys de un objeto (y de los objetos anidados
 * dentro de arrays) a MAYÚSCULAS. El binding SQL del backend real resuelve
 * los paths del body como `:BODY.BASICINFO.NAME` — case-sensitive y en
 * mayúsculas — mientras que nuestros tipos de dominio son camelCase. Esto
 * traduce el payload en el borde de salida, sin tocar los tipos internos.
 *
 * No toca el mock (que sigue esperando camelCase tal cual): solo se usa para
 * las llamadas al backend real, condicionado a `env.ENABLE_API_MOCKING`.
 */
export function toUpperKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => toUpperKeys(item)) as unknown as T
  }

  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key.toUpperCase()] = toUpperKeys(val)
    }
    return result as T
  }

  return value
}
