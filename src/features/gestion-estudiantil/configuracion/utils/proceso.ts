// Validaciones de la pestaña Proceso disciplinario; replican fn_disciplinario_*_validar (V209.2).

import { getErrorMessage } from "@/lib/api-client"

export const LIM_PROCESO = {
  clasificacionNombre: 60,
  sancionNombre: 100,
  descripcion: 500,
  nombreMin: 3,
  diasMin: 1,
  diasMax: 15,
} as const

/**
 * Estado es un booleano en el backend (HABILITADO), no una lista de valores: no hay categoría que lo sirva
 * (ESTADO solo trae «Activo»), y el prototipo lo muestra como opción Activo/Inactivo. Tiene duración va en un Switch.
 */
export const ESTADOS_PROCESO = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
]

export interface ValoresPlazos {
  descargos: string
  recursos: string
}

export interface ValoresClasificacion {
  nombre: string
  descripcion: string
  estado: "activo" | "inactivo"
}

export interface ValoresSancion extends ValoresClasificacion {
  instancia: string
  /** Tiene duración (Switch). */
  duracion: boolean
  efecto: string
}

export type Errores<T> = Partial<Record<keyof T, string>>

function errorDias(valor: string, campo: string): string | undefined {
  const n = Number(valor)
  if (!valor.trim() || !Number.isInteger(n) || n < LIM_PROCESO.diasMin || n > LIM_PROCESO.diasMax)
    return `${campo} debe ser un número entero entre ${LIM_PROCESO.diasMin} y ${LIM_PROCESO.diasMax}.`
  return undefined
}

export function validarPlazos(v: ValoresPlazos): Errores<ValoresPlazos> {
  const e: Errores<ValoresPlazos> = {}
  const d = errorDias(v.descargos, "Días hábiles para presentar descargos")
  const r = errorDias(v.recursos, "Días hábiles para interponer recursos")
  if (d) e.descargos = d
  if (r) e.recursos = r
  return e
}

function errorNombre(nombre: string, max: number): string | undefined {
  const n = nombre.trim().length
  if (!n) return `El nombre es obligatorio (entre ${LIM_PROCESO.nombreMin} y ${max} caracteres).`
  if (n < LIM_PROCESO.nombreMin || n > max) return `El nombre debe tener entre ${LIM_PROCESO.nombreMin} y ${max} caracteres.`
  return undefined
}

export function validarClasificacion(v: ValoresClasificacion): Errores<ValoresClasificacion> {
  const e: Errores<ValoresClasificacion> = {}
  const nombre = errorNombre(v.nombre, LIM_PROCESO.clasificacionNombre)
  if (nombre) e.nombre = nombre
  if (v.descripcion.trim().length > LIM_PROCESO.descripcion)
    e.descripcion = `La descripción debe tener entre 0 y ${LIM_PROCESO.descripcion} caracteres.`
  return e
}

export function validarSancion(v: ValoresSancion, efectoExigeDuracion: boolean): Errores<ValoresSancion> {
  const e: Errores<ValoresSancion> = {}
  const nombre = errorNombre(v.nombre, LIM_PROCESO.sancionNombre)
  if (nombre) e.nombre = nombre
  if (v.descripcion.trim().length > LIM_PROCESO.descripcion)
    e.descripcion = `La descripción debe tener entre 0 y ${LIM_PROCESO.descripcion} caracteres.`
  if (!v.instancia) e.instancia = "La instancia que decide es obligatoria."
  if (!v.efecto) e.efecto = "El efecto de la sanción es obligatorio."
  else if (efectoExigeDuracion && !v.duracion)
    e.duracion = "Matrícula en observación y Suspensión de asistencia exigen Tiene duración."
  return e
}

/**
 * Lleva el mensaje del backend al campo que lo provoca (se muestra inline); lo que no es de un campo
 * (permisos, establecimiento) queda para el banner del modal.
 */
export function errorBackendACampo(
  error: unknown,
): { campo: "nombre" | "descripcion" | "instancia" | "efecto" | "duracion" | "descargos" | "recursos"; mensaje: string } | null {
  const mensaje = getErrorMessage(error)
  const m = mensaje.toLowerCase()
  if (m.includes("ya existe") || m.startsWith("el nombre")) return { campo: "nombre", mensaje }
  if (m.startsWith("la descripción")) return { campo: "descripcion", mensaje }
  if (m.startsWith("la instancia")) return { campo: "instancia", mensaje }
  if (m.includes("exigen tiene duración")) return { campo: "duracion", mensaje }
  if (m.startsWith("el efecto") || m.includes("sector no oficial")) return { campo: "efecto", mensaje }
  if (m.startsWith("días hábiles para presentar")) return { campo: "descargos", mensaje }
  if (m.startsWith("días hábiles para interponer")) return { campo: "recursos", mensaje }
  return null
}
