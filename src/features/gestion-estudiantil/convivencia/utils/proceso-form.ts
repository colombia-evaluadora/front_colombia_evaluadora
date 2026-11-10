import { errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import type { AbrirProcesoInput } from "@/features/gestion-estudiantil/convivencia/api/mutations/procesos"

/** Formulario «Abrir proceso» (G.2.PRD.ABR.1; reglas en Gestión Estudiantil.md, Apertura). */
export interface CargoFila {
  key: string
  codigo: string
  clasificacion: string
  norma: string
  descripcion: string
}

export interface PruebaFila {
  key: string
  descripcion: string
  archivo: File | null
}

export interface ValoresProceso {
  matricula: string
  anotaciones: number[]
  caso: string
  fecha: string
  responsable: string
  cargos: CargoFila[]
  pruebas: PruebaFila[]
}

export const cargoVacio = (codigo = ""): CargoFila => ({
  key: crypto.randomUUID(),
  codigo,
  clasificacion: "",
  norma: "",
  descripcion: "",
})

export const pruebaVacia = (): PruebaFila => ({ key: crypto.randomUUID(), descripcion: "", archivo: null })

export type ErroresCargo = Partial<Record<"codigo" | "clasificacion" | "norma" | "descripcion", string>>

export interface ErroresProceso {
  matricula?: string
  origen?: string
  fecha?: string
  responsable?: string
  cargos: Record<string, ErroresCargo>
  pruebas: Record<string, string>
}

const MAX_BYTES = 10 * 1024 * 1024

export function errorCargo(c: CargoFila): ErroresCargo {
  const e: ErroresCargo = {}
  if (!c.codigo) e.codigo = "Elija el código."
  if (!c.clasificacion) e.clasificacion = "Elija la clasificación."
  const norma = errorLargo(c.norma, 3, 200, "La norma")
  if (norma) e.norma = norma
  const descripcion = errorLargo(c.descripcion, 20, 2000, "La descripción de la conducta")
  if (descripcion) e.descripcion = descripcion
  return e
}

export function errorPrueba(p: PruebaFila): string | undefined {
  if (p.archivo && p.archivo.size > MAX_BYTES) return "El archivo supera los 10 MB."
  return errorLargo(p.descripcion, 5, 300, "La descripción")
}

/** `hoy` en `yyyy-MM-dd`; la fecha no puede ser posterior (se compara como texto ISO). */
export function validarProceso(v: ValoresProceso, hoy: string): ErroresProceso {
  const e: ErroresProceso = { cargos: {}, pruebas: {} }
  if (!v.matricula) e.matricula = "Elija el estudiante."
  if (v.anotaciones.length === 0 && !v.caso) e.origen = "Elija al menos una anotación de origen o el caso de origen."
  if (!v.fecha) e.fecha = "La fecha de apertura es obligatoria."
  else if (v.fecha > hoy) e.fecha = "La fecha de apertura no puede ser posterior a hoy."
  if (!v.responsable) e.responsable = "Elija el responsable del proceso."
  for (const c of v.cargos) {
    const ec = errorCargo(c)
    if (Object.keys(ec).length) e.cargos[c.key] = ec
  }
  for (const p of v.pruebas) {
    const ep = errorPrueba(p)
    if (ep) e.pruebas[p.key] = ep
  }
  return e
}

export const hayErrores = (e: ErroresProceso) =>
  Boolean(e.matricula || e.origen || e.fecha || e.responsable) ||
  Object.keys(e.cargos).length > 0 ||
  Object.keys(e.pruebas).length > 0

export function abrirProcesoInput(v: ValoresProceso): AbrirProcesoInput {
  return {
    matricula: Number(v.matricula),
    fecha: v.fecha,
    responsable: Number(v.responsable),
    anotaciones: v.anotaciones,
    caso: v.caso ? Number(v.caso) : null,
    cargos: v.cargos.map((c) => ({
      fk_comportamiento: Number(c.codigo),
      fk_clasificacion: Number(c.clasificacion),
      norma: c.norma,
      descripcion: c.descripcion,
    })),
    pruebas: v.pruebas.map((p) => ({ descripcion: p.descripcion, archivo: p.archivo })),
  }
}
