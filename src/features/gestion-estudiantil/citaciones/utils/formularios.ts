import { format } from "date-fns"

import type {
  CrearCitacionInput,
  CrearCompromisoInput,
} from "@/features/gestion-estudiantil/citaciones/api/types"

// Formularios de Nueva citación (§4.1) y Nuevo compromiso (§4.2). Las reglas repiten las del backend
// (V612/V614) para marcar el campo antes de enviar; el 22023 del servidor sigue siendo la última palabra.

/** Motivos que solo genera el sistema (`fn_citacion_validar_motivo`): no se ofrecen en el alta manual. */
export const MOTIVOS_SOLO_SISTEMA = ["CASO_CONVIVENCIA", "DILIGENCIA_DESCARGOS", "SENAL_SALUD_MENTAL"]

const MAX_BYTES_SOPORTE = 10 * 1024 * 1024

/** Largo fuera de rango; `campo` lleva su artículo («La descripción») y `obligatorio` concuerda en género. */
function errorLargo(valor: string, min: number, max: number, campo: string, obligatorio = "obligatorio"): string | undefined {
  const n = valor.trim().length
  if (!n) return `${campo} es ${obligatorio}.`
  if (n < min || n > max) return `${campo} debe tener entre ${min} y ${max} caracteres.`
  return undefined
}

// --- Citación ---

export interface ValoresCitacion {
  matricula: string
  motivo: string
  texto: string
  fecha: Date | undefined
  lugar: string
  /** pk de TFUNCIONARIO como texto; "" = por defecto, quien cita (el backend lo resuelve). */
  atiende: string
}

export type ErroresCitacion = Partial<Record<keyof ValoresCitacion, string>>

export const citacionVacia = (): ValoresCitacion => ({
  matricula: "",
  motivo: "",
  texto: "",
  fecha: undefined,
  lugar: "",
  atiende: "",
})

/** Fecha y hora obligatorias y posteriores a ahora (Nueva, Programar y Reprogramar comparten la regla). */
export function errorFechaFutura(fecha: Date | undefined, ahora = new Date()): string | undefined {
  if (!fecha) return "La fecha y hora son obligatorias."
  return fecha.getTime() <= ahora.getTime() ? "La fecha y hora deben ser posteriores a las actuales." : undefined
}

export const errorLugar = (lugar: string) => errorLargo(lugar, 3, 150, "El lugar")

export function validarCitacion(v: ValoresCitacion, ahora = new Date()): ErroresCitacion {
  const e: ErroresCitacion = {}
  if (!v.matricula) e.matricula = "El estudiante es obligatorio."
  if (!v.motivo) e.motivo = "El motivo es obligatorio."
  const texto = errorLargo(v.texto, 10, 1000, "El texto para el acudiente")
  if (texto) e.texto = texto
  const fecha = errorFechaFutura(v.fecha, ahora)
  if (fecha) e.fecha = fecha
  const lugar = errorLugar(v.lugar)
  if (lugar) e.lugar = lugar
  return e
}

export const hayErroresCitacion = (e: ErroresCitacion) => Object.keys(e).length > 0

export function crearCitacionInput(v: ValoresCitacion): CrearCitacionInput {
  return {
    FK_MATRICULA: Number(v.matricula),
    FK_MOTIVO: Number(v.motivo),
    TEXTO: v.texto.trim(),
    FECHA: format(v.fecha as Date, "yyyy-MM-dd'T'HH:mm"),
    LUGAR: v.lugar.trim(),
    FK_ATIENDE: v.atiende ? Number(v.atiende) : null,
  }
}

// --- Compromiso ---

export interface ItemFila {
  key: string
  descripcion: string
  responsable: string
  plazo: string
}

export const itemVacio = (): ItemFila => ({ key: crypto.randomUUID(), descripcion: "", responsable: "", plazo: "" })

export interface ValoresCompromiso {
  matricula: string
  tipo: string
  fecha: string
  revision: string
  items: ItemFila[]
  aceptado: boolean
  soporte: File | null
}

export type ErroresItem = Partial<Record<"descripcion" | "responsable" | "plazo", string>>

export interface ErroresCompromiso {
  matricula?: string
  tipo?: string
  fecha?: string
  revision?: string
  items: Record<string, ErroresItem>
  /** Error del constructor completo (sin ítems). */
  sinItems?: string
  soporte?: string
}

/** Fechas `yyyy-MM-dd`: la comparación de texto equivale a la de fechas. */
export function validarCompromiso(v: ValoresCompromiso, hoy: string): ErroresCompromiso {
  const e: ErroresCompromiso = { items: {} }
  if (!v.matricula) e.matricula = "El estudiante es obligatorio."
  if (!v.tipo) e.tipo = "El tipo de compromiso es obligatorio."
  if (!v.fecha) e.fecha = "La fecha es obligatoria."
  else if (v.fecha > hoy) e.fecha = "La fecha no puede ser posterior a hoy."
  if (!v.revision) e.revision = "La fecha de revisión es obligatoria."
  else if (v.fecha && v.revision <= v.fecha) e.revision = "La fecha de revisión debe ser posterior a la fecha."

  if (v.items.length === 0) e.sinItems = "Agregue al menos un compromiso."
  for (const i of v.items) {
    const ei: ErroresItem = {}
    const descripcion = errorLargo(i.descripcion, 10, 1000, "La descripción", "obligatoria")
    if (descripcion) ei.descripcion = descripcion
    if (!i.responsable) ei.responsable = "Elija el responsable."
    if (!i.plazo) ei.plazo = "El plazo es obligatorio."
    else if (v.fecha && v.revision && (i.plazo < v.fecha || i.plazo > v.revision))
      ei.plazo = "El plazo debe estar entre la fecha y la fecha de revisión."
    if (Object.keys(ei).length) e.items[i.key] = ei
  }

  if (v.aceptado) {
    const soporte = errorSoporte(v.soporte)
    if (soporte) e.soporte = soporte
  }
  return e
}

/** Soporte firmado de la aceptación presencial: obligatorio y de hasta 10 MB. */
export function errorSoporte(soporte: File | null): string | undefined {
  if (!soporte) return "Cargue el soporte firmado para registrar la aceptación presencial."
  return soporte.size > MAX_BYTES_SOPORTE ? "El soporte no puede superar 10 MB." : undefined
}

export const hayErroresCompromiso = (e: ErroresCompromiso) =>
  Boolean(e.matricula || e.tipo || e.fecha || e.revision || e.sinItems || e.soporte || Object.keys(e.items).length)

export function crearCompromisoInput(
  v: ValoresCompromiso,
  archivo: number | null,
  citacion: number | null,
): CrearCompromisoInput {
  return {
    FK_MATRICULA: Number(v.matricula),
    FK_TIPO: Number(v.tipo),
    FECHA: v.fecha,
    FECHA_REVISION: v.revision,
    ITEMS: v.items.map((i) => ({
      descripcion: i.descripcion.trim(),
      fk_tlv_responsable: i.responsable,
      plazo: i.plazo,
    })),
    ACEPTADO: v.aceptado,
    FK_ARCHIVO: v.aceptado ? archivo : null,
    ORIGEN_TIPO: citacion != null ? "CITACION" : null,
    ORIGEN_ID: citacion,
  }
}
