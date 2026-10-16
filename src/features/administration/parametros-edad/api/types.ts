/** Edad recomendada de un grado; `grado` es el pk (como texto) de la lista GRADOS. */
export interface EdadGrado {
  grado: string
  nombre: string
  edad: number
}

/** Fecha de corte de un calendario; `calendario` es el pk (como texto) de la lista CALENDARIO. */
export interface CorteCalendario {
  calendario: string
  nombre: string
  mes: number
  dia: number
}

export interface ParametrosEdad {
  grados: EdadGrado[]
  calendarios: CorteCalendario[]
}

export const EDAD_MIN = 2
export const EDAD_MAX = 25

export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const

/** Días del mes sin año bisiesto: el 29 de febrero no se admite. */
export function diasDelMes(mes: number) {
  return new Date(2023, mes, 0).getDate()
}

export function formatCorte(mes: number, dia: number) {
  return `${dia} de ${MESES[mes - 1]}`
}
