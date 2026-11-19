import { errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { fechaParaBackend as iso } from "@/features/gestion-estudiantil/prevencion/utils/formularios"

// Formularios de la gestión de la alerta (§9.11). Repiten las reglas de V695 para marcar el campo antes de
// enviar; el 22023 del servidor sigue siendo la última palabra.

export const RAZON_MAX = 300
export const MEDIDAS_MAX = 2000
export const RUTA_TEXTO_MIN = 10
export const RUTA_TEXTO_MAX = 1000
export const ACTUACIONES_MAX = 4
export const RECORDATORIOS_MAX = 5
export const GESTION_REMISION_MAX = 2000
export const RESPUESTA_REMISION_MAX = 3000
/** Único resultado que elige quien resuelve; MATRICULA_RETIRADA lo pone el sistema (CK_TPREV_GESTION_RESULTADO). */
export const RESULTADO_VOLVIO = "VOLVIO_A_ASISTIR"

type Errores<K extends string> = Partial<Record<K, string>>

const limpiar = <K extends string>(e: Errores<K>) => {
  for (const k of Object.keys(e) as K[]) if (!e[k]) delete e[k]
  return e
}

const posteriorAHoy = (fecha: Date, hoy: Date) => iso(fecha) > iso(hoy)

export interface ValoresContacto {
  fecha: Date | undefined
  medio: string
  conQuien: string
  resultado: string
  razon: string
}

export function validarContacto(v: ValoresContacto, hoy = new Date()): Errores<keyof ValoresContacto> {
  const e: Errores<keyof ValoresContacto> = {}
  if (!v.fecha) e.fecha = "La fecha es obligatoria."
  else if (posteriorAHoy(v.fecha, hoy)) e.fecha = "La fecha no puede ser posterior a hoy."
  if (!v.medio) e.medio = "El medio es obligatorio."
  if (!v.conQuien) e.conQuien = "Indique con quién se contactó."
  if (!v.resultado) e.resultado = "El resultado del contacto es obligatorio."
  if (v.razon.trim().length > RAZON_MAX) e.razon = `La razón informada admite hasta ${RAZON_MAX} caracteres.`
  return e
}

export function validarResolver(fecha: Date | undefined, hoy = new Date()): string | undefined {
  if (!fecha) return "La fecha de verificación es obligatoria."
  if (posteriorAHoy(fecha, hoy)) return "La fecha de verificación no puede ser posterior a hoy."
  return undefined
}

export interface ValoresRuta {
  entidad: string
  fecha: Date | undefined
  motivo: string
  descripcion: string
  entorno: string
  residencia: string
  actuaciones: string[]
  esperada: Date | undefined
  motivoAjuste: string
  recordatorios: (Date | undefined)[]
}

/** Campos de la ruta de protección (§9.11): el motivo del ajuste solo se pide si cambia la fecha propuesta. */
export function validarRuta(v: ValoresRuta, propuesta: string | null, hoy = new Date()): Errores<keyof ValoresRuta> {
  const e: Errores<keyof ValoresRuta> = {}
  if (!v.entidad) e.entidad = "La entidad es obligatoria."
  if (!v.fecha) e.fecha = "La fecha es obligatoria."
  else if (posteriorAHoy(v.fecha, hoy)) e.fecha = "La fecha no puede ser posterior a hoy."
  e.motivo = errorLargo(v.motivo, RUTA_TEXTO_MIN, RUTA_TEXTO_MAX, "El motivo del informe")
  e.descripcion = errorLargo(v.descripcion, RUTA_TEXTO_MIN, RUTA_TEXTO_MAX, "La descripción de la situación")
  if (v.entorno.trim().length > RUTA_TEXTO_MAX) e.entorno = `Admite hasta ${RUTA_TEXTO_MAX} caracteres.`
  if (v.residencia.trim().length > RUTA_TEXTO_MAX) e.residencia = `Admite hasta ${RUTA_TEXTO_MAX} caracteres.`
  if (v.actuaciones.length > ACTUACIONES_MAX) e.actuaciones = `Elija hasta ${ACTUACIONES_MAX} actuaciones.`
  if (!v.esperada) e.esperada = "La fecha esperada de respuesta es obligatoria."
  else if (v.fecha && iso(v.esperada) <= iso(v.fecha)) e.esperada = "Debe ser posterior a la fecha."
  if (rutaAjustada(v, propuesta))
    e.motivoAjuste = errorLargo(v.motivoAjuste, RUTA_TEXTO_MIN, RUTA_TEXTO_MAX, "El motivo del ajuste")
  e.recordatorios = errorRecordatorios(v.recordatorios, hoy)
  return limpiar(e)
}

export const rutaAjustada = (v: Pick<ValoresRuta, "esperada">, propuesta: string | null) =>
  v.esperada != null && propuesta != null && iso(v.esperada) !== propuesta

function errorRecordatorios(fechas: (Date | undefined)[], hoy: Date): string | undefined {
  if (fechas.length > RECORDATORIOS_MAX) return `Hasta ${RECORDATORIOS_MAX} recordatorios.`
  if (fechas.some((d) => !d)) return "Elija la fecha de cada recordatorio o quite el que sobre."
  const lista = fechas.map((d) => iso(d as Date))
  if (lista.some((d) => d <= iso(hoy))) return "Los recordatorios deben ser posteriores a hoy."
  if (new Set(lista).size !== lista.length) return "No repita una fecha de recordatorio."
  return undefined
}

export interface ValoresGestionRemision {
  fecha: Date | undefined
  descripcion: string
  ajusta: boolean
  nuevaFecha: Date | undefined
  motivoAjuste: string
}

export function validarGestionRemision(
  v: ValoresGestionRemision,
  fechaRemision: string | null,
  hoy = new Date(),
): Errores<keyof ValoresGestionRemision> {
  const e: Errores<keyof ValoresGestionRemision> = {}
  if (!v.fecha) e.fecha = "La fecha es obligatoria."
  else if (posteriorAHoy(v.fecha, hoy)) e.fecha = "La fecha no puede ser posterior a hoy."
  else if (fechaRemision && iso(v.fecha) < fechaRemision.slice(0, 10))
    e.fecha = "La fecha no puede ser anterior a la fecha de la remisión."
  e.descripcion = errorLargo(v.descripcion, 10, GESTION_REMISION_MAX, "La descripción")
  if (v.ajusta) {
    if (!v.nuevaFecha) e.nuevaFecha = "Indique la nueva fecha esperada de respuesta."
    else if (!posteriorAHoy(v.nuevaFecha, hoy)) e.nuevaFecha = "Debe ser posterior a hoy."
    e.motivoAjuste = errorLargo(v.motivoAjuste, 10, RUTA_TEXTO_MAX, "El motivo del ajuste")
  }
  return limpiar(e)
}

export interface ValoresRespuestaRemision {
  fecha: Date | undefined
  respuesta: string
}

export function validarRespuestaRemision(
  v: ValoresRespuestaRemision,
  fechaRemision: string | null,
  hoy = new Date(),
): Errores<keyof ValoresRespuestaRemision> {
  const e: Errores<keyof ValoresRespuestaRemision> = {}
  if (!v.fecha) e.fecha = "La fecha de respuesta es obligatoria."
  else if (posteriorAHoy(v.fecha, hoy)) e.fecha = "La fecha no puede ser posterior a hoy."
  else if (fechaRemision && iso(v.fecha) < fechaRemision.slice(0, 10))
    e.fecha = "La fecha no puede ser anterior a la fecha de la remisión."
  if (!v.respuesta.trim()) e.respuesta = "La respuesta recibida es obligatoria."
  return e
}

/** Causas elegidas → arrays paralelos del PUT (cada causa con su estado). */
export function causasParaBackend(causas: { causa: number; estado: string }[]) {
  return { CAUSAS: causas.map((c) => c.causa), ESTADOS: causas.map((c) => Number(c.estado)) }
}
