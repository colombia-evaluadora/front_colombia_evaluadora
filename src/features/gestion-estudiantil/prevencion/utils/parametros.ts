import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import type { GuardarParametrosInput, ParametrosRiesgo } from "@/features/gestion-estudiantil/prevencion/api/types"

export const AVISO_PARAMETROS =
  "Estos valores rigen las alertas y el umbral de reintegración de todas las Sedes y Jornadas del establecimiento."

export type CampoEntero =
  | "inasistAlerta"
  | "areas"
  | "intervencion"
  | "reintConsec"
  | "reintAlt"
  | "plazoContacto"
  | "plazoIntervencion"
  | "plazoIncumplimiento"
  | "anotaciones"
  | "compromisos"

export type CampoParametro = CampoEntero | "caidaRa"

export interface ValoresParametros extends Record<CampoParametro, string> {
  condiciones: string[]
}

export type ErroresParametros = Partial<Record<CampoParametro, string>>

interface DefCampoEntero {
  campo: CampoEntero
  label: string
  min: number
  max: number
  predeterminado: number
  /** Texto de ayuda sin el «Predeterminado: n.», que se agrega solo. */
  ayuda?: string
}

/** Campos enteros en el orden del prototipo (G.10.RIE.1); la caída del RA va aparte (decimal y opcional). */
export const CAMPOS_ENTEROS: DefCampoEntero[] = [
  { campo: "inasistAlerta", label: "Inasistencias consecutivas para alerta", min: 2, max: 30, predeterminado: 3, ayuda: "Inasistencias injustificadas." },
  { campo: "areas", label: "Asignaturas reprobadas para alerta", min: 1, max: 20, predeterminado: 2 },
  { campo: "intervencion", label: "Inasistencias consecutivas de intervención", min: 3, max: 60, predeterminado: 5, ayuda: "Mayor que las inasistencias para alerta." },
  { campo: "reintConsec", label: "Inasistencias consecutivas de reintegración", min: 3, max: 60, predeterminado: 10, ayuda: "Mayor que las de intervención." },
  { campo: "reintAlt", label: "Inasistencias alternadas de reintegración", min: 2, max: 100, predeterminado: 15, ayuda: "En el Período de Evaluación." },
  { campo: "plazoContacto", label: "Plazo del contacto con el acudiente (días hábiles)", min: 1, max: 10, predeterminado: 2 },
  { campo: "plazoIntervencion", label: "Plazo de intervención (días hábiles)", min: 1, max: 15, predeterminado: 3 },
  { campo: "plazoIncumplimiento", label: "Plazo de incumplimiento del plan (semanas)", min: 1, max: 12, predeterminado: 2 },
  { campo: "anotaciones", label: "Anotaciones negativas para alerta", min: 1, max: 20, predeterminado: 3, ayuda: "En el Período de Evaluación." },
  { campo: "compromisos", label: "Compromisos incumplidos para alerta", min: 1, max: 10, predeterminado: 1, ayuda: "En el Período Académico." },
]

export const CAIDA_RA_MIN = 0.1
export const CAIDA_RA_LABEL = "Caída del RA para alerta"

/** Condiciones de la matrícula que acepta el backend (casillas, §9.5). */
export const CONDICIONES: Opcion[] = [
  { value: "VICTIMA_CONFLICTO", label: "Población víctima del conflicto" },
  { value: "CONDICIONES_ESPECIALES", label: "Condiciones especiales" },
  { value: "MADRE_CABEZA_FAMILIA", label: "Alumna madre cabeza de familia" },
]

const texto = (n: number) => String(n)

export function valoresIniciales(p: ParametrosRiesgo): ValoresParametros {
  return {
    inasistAlerta: texto(p.inasist_consec_alerta),
    caidaRa: p.caida_ra_alerta == null ? "" : String(p.caida_ra_alerta).replace(".", ","),
    areas: texto(p.areas_reprobadas_alerta),
    intervencion: texto(p.inasist_consec_intervencion),
    reintConsec: texto(p.inasist_consec_reintegracion),
    reintAlt: texto(p.inasist_alternadas_reintegracion),
    plazoContacto: texto(p.plazo_contacto_dias),
    plazoIntervencion: texto(p.plazo_intervencion_dias),
    plazoIncumplimiento: texto(p.plazo_incumplimiento_semanas),
    anotaciones: texto(p.anotaciones_negativas_alerta),
    compromisos: texto(p.compromisos_incumplidos_alerta),
    condiciones: [...p.condiciones_alerta],
  }
}

/** Decimal escrito con coma o punto; null si no es un número. */
export function parseDecimal(valor: string): number | null {
  const t = valor.trim().replace(",", ".")
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  return Number(t)
}

/** Limpia lo tecleado en la caída del RA: dígitos y un solo separador, un decimal. */
export function limpiarDecimal(valor: string): string {
  const [entero = "", ...resto] = valor.replace(/[^\d.,]/g, "").split(/[.,]/)
  const base = entero.slice(0, 3)
  return resto.length ? `${base},${resto.join("").slice(0, 1)}` : base
}

/** Validaciones de §9.5: rangos y el orden alerta < intervención < reintegración consecutiva ≤ alternadas. */
export function validarParametros(v: ValoresParametros): ErroresParametros {
  const e: ErroresParametros = {}
  const n: Partial<Record<CampoEntero, number>> = {}

  for (const c of CAMPOS_ENTEROS) {
    const t = v[c.campo].trim()
    if (!t) e[c.campo] = `${c.label} es obligatorio.`
    else {
      const valor = Number(t)
      if (!Number.isInteger(valor) || valor < c.min || valor > c.max) e[c.campo] = `Debe estar entre ${c.min} y ${c.max}.`
      else n[c.campo] = valor
    }
  }

  const caida = v.caidaRa.trim()
  if (caida) {
    const valor = parseDecimal(caida)
    if (valor == null || valor < CAIDA_RA_MIN) e.caidaRa = "Debe ser un número desde 0,1, con un decimal."
  }

  if (!e.intervencion && n.intervencion != null && n.inasistAlerta != null && n.intervencion <= n.inasistAlerta)
    e.intervencion = "Debe ser mayor que las inasistencias consecutivas para alerta."
  if (!e.reintConsec && n.reintConsec != null && n.intervencion != null && n.reintConsec <= n.intervencion)
    e.reintConsec = "Debe ser mayor que las inasistencias consecutivas de intervención."
  if (!e.reintAlt && n.reintAlt != null && n.reintConsec != null && n.reintAlt < n.reintConsec)
    e.reintAlt = "No puede ser menor que las inasistencias consecutivas de reintegración."
  return e
}

export const hayErroresParametros = (e: ErroresParametros) => Object.keys(e).length > 0

/** Cuerpo del `PUT /parametros`; la caída del RA vacía viaja null (proporcional al formato). */
export function parametrosParaBackend(establecimiento: number, v: ValoresParametros): GuardarParametrosInput {
  return {
    ESTABLECIMIENTO: establecimiento,
    INASIST_CONSEC_ALERTA: Number(v.inasistAlerta),
    CAIDA_RA_ALERTA: v.caidaRa.trim() ? parseDecimal(v.caidaRa) : null,
    AREAS_REPROBADAS_ALERTA: Number(v.areas),
    INASIST_CONSEC_INTERVENCION: Number(v.intervencion),
    INASIST_CONSEC_REINTEGRACION: Number(v.reintConsec),
    INASIST_ALTERNADAS_REINTEGRACION: Number(v.reintAlt),
    PLAZO_INCUMPLIMIENTO_SEMANAS: Number(v.plazoIncumplimiento),
    PLAZO_CONTACTO_DIAS: Number(v.plazoContacto),
    PLAZO_INTERVENCION_DIAS: Number(v.plazoIntervencion),
    ANOTACIONES_NEGATIVAS_ALERTA: Number(v.anotaciones),
    COMPROMISOS_INCUMPLIDOS_ALERTA: Number(v.compromisos),
    CONDICIONES_ALERTA: v.condiciones,
  }
}

export const hayCambios = (a: ValoresParametros, b: ValoresParametros) => JSON.stringify(a) !== JSON.stringify(b)
