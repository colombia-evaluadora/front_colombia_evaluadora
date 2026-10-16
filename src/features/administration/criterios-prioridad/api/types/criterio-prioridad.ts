/** Envoltura de las funciones del módulo: `SELECT fn(...) AS resultado`. */
export interface Resultado<T> {
  resultado: T
}

/** Códigos de la lista REGLA_PRIORIDAD (valores del sistema, V318). */
export type ReglaCodigo = "ES_SI" | "TIENE_VALOR" | "ES_UNO_DE" | "MENOR_A_MAYOR" | "MAYOR_A_MENOR"

export interface BloqueCriterio {
  /** "2.8" (sección de la matrícula) o "INSCRIPCION". */
  codigo: string
  nombre: string
}

export interface CampoCriterio {
  pkCampo: number
  codigo: string
  nombre: string
  tipo: "SI_NO" | "SELECTOR"
  /** Lista de Valores del selector; null en Sí/No y en Condiciones especiales. */
  categoria: string | null
  bloque: BloqueCriterio
}

export interface CriterioPrioridad {
  pkCriterio: number
  nombre: string
  descripcion: string | null
  /** Estado Activo/Inactivo. */
  habilitado: boolean
  /** Lo aplica algún período en su Configuración de la admisión: solo se desactiva. */
  enUso: boolean
  campo: CampoCriterio
  regla: { pkRegla: number; codigo: ReglaCodigo; nombre: string }
  /** Solo con la regla Es uno de. */
  valores: { pkListaValor: number; nombre: string }[]
}

/** Regla tal como la ofrece un campo: `motivo` = por qué no aplica (null = aplica). */
export interface ReglaOpcion {
  pkRegla: number
  codigo: ReglaCodigo
  nombre: string
  motivo: string | null
}

export interface CampoOpcion {
  pkCampo: number
  codigo: string
  nombre: string
  tipo: "SI_NO" | "SELECTOR"
  categoria: string | null
  esOrdinal: boolean
  reglas: ReglaOpcion[]
  valores: { pkListaValor: number; nombre: string }[]
}

/** Bloque 2.2–2.13 de la matrícula o Inscripción, con sus campos evaluables. */
export interface BloqueOpcion extends BloqueCriterio {
  campos: CampoOpcion[]
}

export const CRITERIO_EN_USO_MENSAJE = "Este criterio está en uso: solo se puede desactivar."

/** "2.8 · Sisbén" / "Inscripción · Hermano verificado". */
export function bloqueCampoTexto(campo: CampoCriterio) {
  const bloque = campo.bloque.codigo === "INSCRIPCION" ? "Inscripción" : campo.bloque.codigo
  return `${bloque} · ${campo.nombre}`
}

/** "2.8 Información complementaria" / "Inscripción". */
export function bloqueTexto(bloque: BloqueCriterio) {
  return bloque.codigo === "INSCRIPCION" ? bloque.nombre : `${bloque.codigo} ${bloque.nombre}`
}
