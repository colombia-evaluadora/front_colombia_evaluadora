/** Compara sin orden de claves; `null`, `undefined` y ausente son iguales. */
export function formValuesEqual(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return a == null && b == null
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, i) => formValuesEqual(item, b[i]))
  }
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  if (typeof a === "object" && typeof b === "object") {
    const objA = a as Record<string, unknown>
    const objB = b as Record<string, unknown>
    const keys = new Set([...Object.keys(objA), ...Object.keys(objB)])
    return [...keys].every((key) => formValuesEqual(objA[key], objB[key]))
  }
  return Object.is(a, b)
}
