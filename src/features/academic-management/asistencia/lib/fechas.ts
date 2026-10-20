/**
 * Fechas de la pantalla de Asistencia. Viven acá (y no dentro de la página)
 * porque "Preparar sin conexión" arma las MISMAS keys que la pantalla
 * (`features/offline/lib/prepare-tasks.ts`): una fecha distinta en un solo
 * dígito es otra key y, sin red, el dato no aparece.
 */

/** `yyyy-MM-dd` en hora local. */
export function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/**
 * Fecha para el resumen de horas: el lunes de la semana del día, sin salir de su
 * mes. fn_asistencia_resumen_horas (V140) solo usa la fecha para el año, el mes
 * y la semana, así que cambiar de día dentro de la misma semana no la consulta de nuevo.
 */
export function fechaResumen(date: Date) {
  const lunes = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7))
  return toIsoDate(lunes.getMonth() === date.getMonth() ? lunes : new Date(date.getFullYear(), date.getMonth(), 1))
}

/** Las fechas de resumen distintas de un mes (una por semana), en orden. */
export function fechasResumenDelMes(anio: number, mes: number): string[] {
  const ultimo = new Date(anio, mes, 0).getDate()
  const fechas = new Set<string>()
  for (let dia = 1; dia <= ultimo; dia++) fechas.add(fechaResumen(new Date(anio, mes - 1, dia)))
  return [...fechas]
}
