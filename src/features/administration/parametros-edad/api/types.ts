/** Cortes de la situación de edad, en años de diferencia con la edad recomendada. */
export interface Cortes {
  bajaEdadHasta: number
  preextraedadDesde: number
  extraedadDesde: number
}

/** Cortes propios de un grado: null = rige el corte por defecto. */
export type CortesGrado = { [K in keyof Cortes]: number | null }

/** Edad recomendada de un grado; `grado` es el pk (como texto) de la lista GRADOS. */
export interface EdadGrado extends CortesGrado {
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
  cortesDefecto: Cortes
}

export const EDAD_MIN = 2
export const EDAD_MAX = 25

/** Rango de cada corte, igual que en `fn_parametroedad_validar_cortes`. */
export const CORTES = [
  { campo: "bajaEdadHasta", label: "Baja edad hasta", min: -5, max: -1 },
  { campo: "preextraedadDesde", label: "Preextraedad desde", min: 1, max: 10 },
  { campo: "extraedadDesde", label: "Extraedad desde", min: 2, max: 15 },
] as const satisfies readonly { campo: keyof Cortes; label: string; min: number; max: number }[]

/** Mensaje del primer corte inválido, o null. Recibe los cortes que van a regir. */
export function validarCortes(c: Cortes): string | null {
  if (c.bajaEdadHasta >= 0 || c.preextraedadDesde <= 0) {
    return "El corte de Baja edad debe ser negativo y el de Preextraedad, positivo."
  }
  for (const r of CORTES) {
    if (c[r.campo] < r.min || c[r.campo] > r.max) {
      return `${r.label} debe estar entre ${formatDiferencia(r.min)} y ${formatDiferencia(r.max)}.`
    }
  }
  if (c.extraedadDesde <= c.preextraedadDesde) {
    return "El corte de Extraedad debe ser mayor que el de Preextraedad."
  }
  return null
}

/** Diferencia en años con signo: −2, +1. */
export function formatDiferencia(n: number) {
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0"
}

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
