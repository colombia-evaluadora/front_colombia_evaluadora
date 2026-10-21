/** Módulos auditados, con el código que usa el back (`MODULO`). */
export const BITACORA_MODULOS = {
  ESTABLECIMIENTO: "Establecimiento",
  COBERTURA: "Cobertura Educativa",
  GESTION_ACADEMICA: "Gestión Académica",
  GESTION_ESTUDIANTIL: "Gestión Estudiantil",
  ADMINISTRACION: "Administración del Sistema",
} as const

export type BitacoraModulo = keyof typeof BITACORA_MODULOS

export const BITACORA_MODULO_IDS = Object.keys(BITACORA_MODULOS) as BitacoraModulo[]

export const BITACORA_ACCIONES = {
  CREAR: "Crear",
  MODIFICAR: "Modificar",
  CAMBIO_ESTADO: "Cambio de estado",
  ELIMINAR: "Eliminar",
  RESTAURACION: "Restauración",
} as const

export type BitacoraAccion = keyof typeof BITACORA_ACCIONES

export const BITACORA_ACCION_IDS = Object.keys(BITACORA_ACCIONES) as BitacoraAccion[]

export type TipoRestauracion = "RESTAURAR_VALOR" | "RECUPERAR_REGISTRO"

export const TIPO_RESTAURACION_LABEL: Record<TipoRestauracion, string> = {
  RESTAURAR_VALOR: "Restaurar valor",
  RECUPERAR_REGISTRO: "Recuperar registro eliminado",
}

export interface BitacoraEntidad {
  codigo: string
  nombre: string
}

export interface BitacoraCambio {
  campo: string
  anterior: string | null
  nuevo: string | null
  /** Valor que tiene hoy el campo (`null` si el registro ya no existe). */
  actual?: string | null
}

export interface EventoPosterior {
  pk: string
  fecha: string
  usuario: string
  sede: string | null
  accion: string
  campo: string | null
}

/** Una fila del listado (ClickHouse). */
export interface BitacoraEvento {
  /** `lsn-seq`. */
  id: string
  fecha: Date
  usuario: { nombre: string; documento: string | null; rol: string | null }
  esSistema: boolean
  sede: string | null
  jornada: string | null
  entidad: string
  registro: string
  accion: BitacoraAccion
  /** Columnas que cambiaron, sin nombre legible (los legibles vienen del estado). */
  campos: string[]
  motivo: string | null
  tipoRestauracion: TipoRestauracion | null
  motivoBloqueoEvento: string | null
  /** El registro sigue como lo dejó el evento. */
  vigente: boolean
  eventosPosteriores: EventoPosterior[]
}

/** Lo que agrega `sso-admin /estado` para cada evento de la página. */
export interface BitacoraEstado {
  id: string
  cambios: BitacoraCambio[]
  vista: string | null
  /** Permisos de Guardar en la vista dueña (Regla 18) y catálogo. */
  puede: boolean
  motivoBloqueo: string | null
}

export interface BitacoraPagina {
  rows: BitacoraEvento[]
  totalCount: number
  pageCount: number
}
