/**
 * `yyyy-MM-dd` → `dd/MM/yyyy`. Mismo helper que ya usa
 * `enrollments-page.tsx`; se re-exporta acá para no crear una dependencia
 * cruzada entre features.
 *
 * Si el valor no calza con el formato esperado (string vacío, mal formado,
 * `null`/undefined), se devuelve el valor original sin tirar — la pantalla
 * preferirá mostrar el texto crudo a mostrar "Invalid Date".
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return ""
  const [year, month, day] = value.slice(0, 10).split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

/**
 * `yyyy-MM-dd` → `Date` local a medianoche. Útil para comparar contra
 * `displayMonth` en la grilla del Planeador. Devuelve `undefined` si el
 * string no calza con `yyyy-MM-dd`.
 */
export function parseLocalDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.slice(0, 10).split("-")
  if (!year || !month || !day) return undefined
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(date.getTime()) ? undefined : date
}