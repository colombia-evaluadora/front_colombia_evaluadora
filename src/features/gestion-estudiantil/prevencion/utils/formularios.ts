import { format } from "date-fns"

import { errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import type { AccionPlanInput } from "@/features/gestion-estudiantil/prevencion/api/types"

// Formularios de Valoración y Plan (§9.3). Las reglas repiten las de V642 para marcar el campo antes de
// enviar; el 22023 del servidor sigue siendo la última palabra.

export const ANALISIS_MIN = 10
export const ANALISIS_MAX = 3000
export const OBJETIVO_MIN = 10
export const OBJETIVO_MAX = 1000
export const DESCRIPCION_MIN = 10
export const DESCRIPCION_MAX = 1000

const iso = (fecha: Date) => format(fecha, "yyyy-MM-dd")

/** `Date` del formulario → `aaaa-mm-dd` que espera el backend. */
export const fechaParaBackend = iso

export interface ValoresValoracion {
  fecha: Date | undefined
  nivel: string
  analisis: string
}

export type ErroresValoracion = Partial<Record<keyof ValoresValoracion, string>>

export function validarValoracion(v: ValoresValoracion, ahora = new Date()): ErroresValoracion {
  const e: ErroresValoracion = {}
  if (!v.fecha) e.fecha = "La fecha es obligatoria."
  else if (iso(v.fecha) > iso(ahora)) e.fecha = "La fecha no puede ser posterior a hoy."
  if (!v.nivel) e.nivel = "El nivel de riesgo es obligatorio."
  const analisis = errorLargo(v.analisis, ANALISIS_MIN, ANALISIS_MAX, "El análisis")
  if (analisis) e.analisis = analisis
  return e
}

export interface ValoresAccion {
  /** Clave estable para la lista (no viaja). */
  clave: string
  tipo: string
  descripcion: string
  responsable: string
  plazo: Date | undefined
  /** pk de la estrategia de permanencia (opcional); "" = ninguna. */
  estrategia: string
  /** La acción ya guardada con estrategia: queda fija (cambiarla o quitarla es 22023). */
  estrategiaFija?: boolean
}

export type ErroresAccion = Partial<Record<"tipo" | "descripcion" | "responsable" | "plazo", string>>

export interface ValoresPlan {
  objetivo: string
  inicio: Date | undefined
  fin: Date | undefined
  acciones: ValoresAccion[]
}

export interface ErroresPlan {
  objetivo?: string
  inicio?: string
  fin?: string
  acciones?: string
  /** Un registro por acción, en el mismo orden. */
  porAccion: ErroresAccion[]
}

let contador = 0
export const nuevaClaveAccion = () => `accion-${++contador}`

export const accionVacia = (responsable = ""): ValoresAccion => ({
  clave: nuevaClaveAccion(),
  tipo: "",
  descripcion: "",
  responsable,
  plazo: undefined,
  estrategia: "",
})

/**
 * @param fechaValoracion `aaaa-mm-dd` de la valoración de origen: el inicio no puede ser anterior.
 */
export function validarPlan(v: ValoresPlan, fechaValoracion?: string | null): ErroresPlan {
  const e: ErroresPlan = { porAccion: [] }
  const objetivo = errorLargo(v.objetivo, OBJETIVO_MIN, OBJETIVO_MAX, "El objetivo")
  if (objetivo) e.objetivo = objetivo
  if (!v.inicio) e.inicio = "La fecha de inicio es obligatoria."
  else if (fechaValoracion && iso(v.inicio) < fechaValoracion.slice(0, 10))
    e.inicio = "La fecha de inicio no puede ser anterior a la fecha de la valoración."
  if (!v.fin) e.fin = "La fecha de fin prevista es obligatoria."
  else if (v.inicio && iso(v.fin) <= iso(v.inicio)) e.fin = "La fecha de fin debe ser posterior a la de inicio."
  if (v.acciones.length === 0) e.acciones = "Agregue al menos una acción."
  e.porAccion = v.acciones.map((a) => {
    const r: ErroresAccion = {}
    if (!a.tipo) r.tipo = "El tipo de acción es obligatorio."
    const d = errorLargo(a.descripcion, DESCRIPCION_MIN, DESCRIPCION_MAX, "La descripción")
    if (d) r.descripcion = d
    if (!a.responsable) r.responsable = "El responsable es obligatorio."
    if (!a.plazo) r.plazo = "El plazo es obligatorio."
    else if (v.inicio && iso(a.plazo) < iso(v.inicio)) r.plazo = "El plazo no puede ser anterior al inicio del plan."
    else if (v.fin && iso(a.plazo) > iso(v.fin)) r.plazo = "El plazo no puede ser posterior al fin del plan."
    return r
  })
  return e
}

export const hayErroresPlan = (e: ErroresPlan) =>
  Boolean(e.objetivo || e.inicio || e.fin || e.acciones || e.porAccion.some((a) => Object.keys(a).length > 0))

export const hayErroresValoracion = (e: ErroresValoracion) => Object.keys(e).length > 0

export function accionesParaBackend(acciones: ValoresAccion[]): AccionPlanInput[] {
  return acciones.map((a) => ({
    fk_tipo: Number(a.tipo),
    descripcion: a.descripcion.trim(),
    fk_responsable: Number(a.responsable),
    plazo: iso(a.plazo as Date),
    fk_estrategia: a.estrategia ? Number(a.estrategia) : null,
  }))
}
