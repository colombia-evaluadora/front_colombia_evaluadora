/** Envoltura de las funciones del back: `SELECT fn(...) AS resultado`. */
export interface Resultado<T> {
  resultado: T
}

export type CuentaDesde = "CREACION" | "CIERRE_ANIO" | "RETIRO_EGRESO"
export type Disposicion = "ANONIMIZAR" | "ARCHIVAR"

/** Una por tipo de registro (Sección 6.4). Permanente: sin plazo ni disposición. */
export interface Politica {
  pkPolitica: number
  tipoRegistro: string
  /** Módulo de la Sección 4.1 (menú padre). */
  pkModulo: number
  modulo: string
  permanente: boolean
  plazoMinimo: number | null
  cuentaDesde: CuentaDesde | null
  disposicion: Disposicion | null
  /** El back sabe leer sus registros; sin fuente nunca vence. */
  conFuente: boolean
  habilitado: boolean
}

/** Plazo de una política activa no permanente en un establecimiento; solo se alarga. */
export interface Ampliacion {
  pkPolitica: number
  /** null = sin ampliar. */
  pkAmpliacion: number | null
  tipoRegistro: string
  plazoMinimo: number
  /** null = sin ampliar (rige el mínimo). */
  plazoEstablecimiento: number | null
}

/** Una fila por tipo de registro y establecimiento. */
export interface Vencido {
  pkPolitica: number
  tipoRegistro: string
  pkEstablecimiento: number
  establecimiento: string
  cantidad: number
  /** yyyy-MM-dd: el vencimiento más antiguo del lote. */
  vencidoDesde: string
  disposicion: Disposicion
}

export interface RegistroVencido {
  /** Qué registro es (p. ej. «Mensaje · Reunión de padres»). Pendiente en el back: hoy solo lo trae el mock. */
  registro?: string
  /** yyyy-MM-dd: cuándo se creó el registro. Pendiente en el back: hoy solo lo trae el mock. */
  fechaRegistro?: string
  estudiante: string
  documento: string
  anio: number
  vencidoDesde: string
}

/** Fila del índice del archivo histórico. */
export interface Archivado {
  pkArchivo: number
  tipoRegistro: string
  estudiante: string
  documento: string
  anio: number
  establecimiento: string
  /** yyyy-MM-dd */
  fechaDisposicion: string
}

export interface ConservacionConfig {
  /** Archivar se habilita cuando se decida el almacenamiento (S.12.VEN.2). */
  almacenamientoArchivo: boolean
}

export interface ModuloOpcion {
  pkModulo: number
  nombre: string
}

export const CUENTA_DESDE_LABELS: Record<CuentaDesde, string> = {
  CREACION: "Creación del registro",
  CIERRE_ANIO: "Cierre del año académico",
  RETIRO_EGRESO: "Retiro o egreso del estudiante",
}

export const DISPOSICION_LABELS: Record<Disposicion, string> = {
  ANONIMIZAR: "Anonimizar",
  ARCHIVAR: "Archivar",
}

/** Textos de S.12.VEN.2: el almacenamiento del archivo histórico no responde en ese momento. */
export const ARCHIVAR_NO_DISPONIBLE =
  "Archivar no está disponible: no se pudo conectar con el almacenamiento del archivo histórico. Intente de nuevo más tarde."
export const ALMACENAMIENTO_NO_RESPONDE = "El almacenamiento del archivo histórico no responde en este momento."

/** Mensajes de la ampliación (Sección 6.4). */
export const PLAZO_MENOR_MENSAJE = "El plazo del establecimiento no puede ser menor que el plazo mínimo."
export const AMPLIACION_REPETIDA_MENSAJE = "Ya existe una ampliación para ese tipo de registro."

export const HUELLA_NO_COINCIDE = "El archivo no es idéntico al original."

/** Descargar archivo: la huella calculada no coincide con la guardada al archivar (S.12.HIS.1a). */
export class HuellaNoCoincideError extends Error {
  guardada: string
  calculada: string
  constructor(guardada: string, calculada: string) {
    super(HUELLA_NO_COINCIDE)
    this.name = "HuellaNoCoincideError"
    this.guardada = guardada
    this.calculada = calculada
  }
}

/** yyyy-MM-dd → dd/MM/yyyy sin pasar por Date (evita el corrimiento de zona). */
export const fechaCorta = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/")
