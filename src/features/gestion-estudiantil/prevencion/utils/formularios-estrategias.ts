import { format } from "date-fns"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"

// Formularios de Estrategias de permanencia (§9.7). Repiten las reglas del backend para marcar el campo antes
// de enviar; el 400/409 del servidor sigue siendo la última palabra.

export const NOMBRE_MIN = 3
export const NOMBRE_MAX = 120
export const DESCRIPCION_MIN = 10
export const DESCRIPCION_MAX = 2000
export const FUENTE_MAX = 150
export const REQUISITOS_MAX = 500
export const MOTIVO_SALIDA_MAX = 300
export const RESULTADO_MAX = 3000
/** Texto sugerido al finalizar una estrategia Planeada (que no llegó a ejecutarse). */
export const RESULTADO_NO_EJECUTADA = "No se ejecutó"

const iso = (fecha: Date) => format(fecha, "yyyy-MM-dd")
const dia = (valor: string) => valor.slice(0, 10)

export interface LimitesFechas {
  /** `aaaa-mm-dd` (o timestamp): primer día permitido. */
  desde?: string | null
  /** Último día permitido. */
  hasta?: string | null
}

export interface ValoresEstrategia {
  nombre: string
  tipo: string
  periodo: string
  inicio: Date | undefined
  fin: Date | undefined
  responsable: string
  fuente: string
  meta: string
  descripcion: string
  requisitos: string
}
export type ErroresEstrategia = Partial<Record<keyof ValoresEstrategia, string>>

/** @param periodo límites del Período Académico elegido (fechas dentro de él). */
export function validarEstrategia(v: ValoresEstrategia, periodo: LimitesFechas | null): ErroresEstrategia {
  const e: ErroresEstrategia = {}
  const n = errorLargo(v.nombre, NOMBRE_MIN, NOMBRE_MAX, "El nombre")
  if (n) e.nombre = n
  if (!v.tipo) e.tipo = "El tipo de estrategia es obligatorio."
  if (!v.periodo) e.periodo = "El Período Académico es obligatorio."
  if (!v.responsable) e.responsable = "El responsable es obligatorio."

  if (!v.inicio) e.inicio = "La fecha de inicio es obligatoria."
  else if (periodo?.desde && iso(v.inicio) < dia(periodo.desde))
    e.inicio = `La fecha de inicio debe estar dentro del Período Académico (desde ${formatFecha(periodo.desde)}).`
  else if (periodo?.hasta && iso(v.inicio) > dia(periodo.hasta))
    e.inicio = `La fecha de inicio debe estar dentro del Período Académico (hasta ${formatFecha(periodo.hasta)}).`

  if (v.fin) {
    if (v.inicio && iso(v.fin) <= iso(v.inicio)) e.fin = "La fecha de fin debe ser posterior a la de inicio."
    else if (periodo?.hasta && iso(v.fin) > dia(periodo.hasta))
      e.fin = `La fecha de fin debe estar dentro del Período Académico (hasta ${formatFecha(periodo.hasta)}).`
  }

  if (v.fuente.trim().length > FUENTE_MAX) e.fuente = `La fuente de financiación admite hasta ${FUENTE_MAX} caracteres.`
  if (v.meta.trim() && !(Number.isInteger(Number(v.meta)) && Number(v.meta) >= 1))
    e.meta = "La meta debe ser un entero mayor o igual a 1."
  const d = errorLargo(v.descripcion, DESCRIPCION_MIN, DESCRIPCION_MAX, "La descripción")
  // `errorLargo` concuerda en masculino: «La descripción es obligatoria».
  if (d) e.descripcion = d.replace("es obligatorio.", "es obligatoria.")
  if (v.requisitos.trim().length > REQUISITOS_MAX)
    e.requisitos = `Los requisitos de ingreso admiten hasta ${REQUISITOS_MAX} caracteres.`
  return e
}

export interface ValoresCopia {
  inicio: Date | undefined
  fin: Date | undefined
}
export type ErroresCopia = Partial<Record<keyof ValoresCopia, string>>

export function validarCopia(v: ValoresCopia): ErroresCopia {
  const e: ErroresCopia = {}
  if (!v.inicio) e.inicio = "La fecha de inicio es obligatoria."
  if (v.inicio && v.fin && iso(v.fin) <= iso(v.inicio)) e.fin = "La fecha de fin debe ser posterior a la de inicio."
  return e
}

export interface ValoresRetiro {
  salida: Date | undefined
  resultado: string
  motivo: string
}
export type ErroresRetiro = Partial<Record<keyof ValoresRetiro, string>>

/** @param ingreso Fecha de ingreso del beneficiario: la salida es posterior. */
export function validarRetiro(v: ValoresRetiro, ingreso: string): ErroresRetiro {
  const e: ErroresRetiro = {}
  if (!v.salida) e.salida = "La fecha de salida es obligatoria."
  else if (iso(v.salida) <= dia(ingreso)) e.salida = "La fecha de salida debe ser posterior a la de ingreso."
  if (!v.resultado) e.resultado = "El resultado de la salida es obligatorio."
  if (v.motivo.trim().length > MOTIVO_SALIDA_MAX)
    e.motivo = `El motivo de salida admite hasta ${MOTIVO_SALIDA_MAX} caracteres.`
  return e
}

export function validarFinalizar(resultado: string): { resultado?: string } {
  const r = errorLargo(resultado, 1, RESULTADO_MAX, "El resultado")
  return r ? { resultado: r } : {}
}

/** Fecha de ingreso al agregar beneficiarios: dentro de las fechas de la estrategia. */
export function errorFechaIngreso(fecha: Date | undefined, limites: LimitesFechas): string | undefined {
  if (!fecha) return "La fecha de ingreso es obligatoria."
  if (limites.desde && iso(fecha) < dia(limites.desde))
    return `La fecha de ingreso no puede ser anterior al inicio de la estrategia (${formatFecha(limites.desde)}).`
  if (limites.hasta && iso(fecha) > dia(limites.hasta))
    return `La fecha de ingreso no puede ser posterior al fin de la estrategia (${formatFecha(limites.hasta)}).`
  return undefined
}

/** «412 de 450»; sin beneficiarios «— de 30»; sin meta, solo el número. */
export function formatBeneficiarios(beneficiarios: number | null, meta: number | null): string {
  if (meta == null) return String(beneficiarios ?? 0)
  return `${beneficiarios ? beneficiarios : "—"} de ${meta}`
}

/** «01/02/2027 a 30/11/2027»; sin fin, «desde 01/02/2027». */
export function formatRangoFechas(inicio: string, fin: string | null): string {
  if (!fin) return `desde ${formatFecha(inicio)}`
  return `${formatFecha(inicio)} a ${formatFecha(fin)}`
}

/** `23 (100 %)` con coma decimal; sin total, solo el número. */
export function formatConPorcentaje(parte: number, total: number): string {
  if (total <= 0) return `${parte}`
  const pct = (parte / total) * 100
  const texto = (Math.round(pct * 10) / 10).toString().replace(".", ",")
  return `${parte} (${texto} %)`
}

/** Porcentaje 0-100 o «Sin datos». */
export function formatPct(valor: number | null | undefined): string {
  return valor == null ? "Sin datos" : `${(Math.round(valor * 10) / 10).toString().replace(".", ",")} %`
}

/** Rendimiento promedio o «Sin datos». */
export function formatRendimiento(valor: number | null | undefined): string {
  return valor == null ? "Sin datos" : (Math.round(valor * 100) / 100).toString().replace(".", ",")
}
