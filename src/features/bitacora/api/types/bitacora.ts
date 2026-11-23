/** Módulos auditados, con el código que usa el back (`MODULO`). */
export const BITACORA_MODULOS = {
  ESTABLECIMIENTO: "Establecimiento",
  COBERTURA: "Cobertura educativa",
  GESTION_ACADEMICA: "Gestión académica",
  GESTION_ESTUDIANTIL: "Gestión estudiantil",
  /** B.1.EVA.1: sus valoraciones son información reservada; se registra la consulta de terceros. */
  EVALUACION_DESEMPENO: "Evaluación del desempeño",
  ADMINISTRACION: "Administración del sistema",
  COMUNICACIONES: "Comunicaciones",
} as const

export type BitacoraModulo = keyof typeof BITACORA_MODULOS

/**
 * Cada módulo es un submenú de Bitácora (como en el prototipo): su ruta es
 * `/app/registro-de-actividad/bitacora/{slug}`.
 */
export const BITACORA_MODULO_SLUG: Record<BitacoraModulo, string> = {
  ESTABLECIMIENTO: "establecimiento",
  COBERTURA: "cobertura-educativa",
  GESTION_ACADEMICA: "gestion-academica",
  GESTION_ESTUDIANTIL: "gestion-estudiantil",
  EVALUACION_DESEMPENO: "evaluacion-del-desempeno",
  ADMINISTRACION: "administracion-del-sistema",
  COMUNICACIONES: "comunicaciones",
}

/** Slug de la ruta → módulo; un slug desconocido cae en Establecimiento. */
export function moduloDeSlug(slug: string | undefined): BitacoraModulo {
  const par = Object.entries(BITACORA_MODULO_SLUG).find(([, s]) => s === slug)
  return (par?.[0] as BitacoraModulo | undefined) ?? "ESTABLECIMIENTO"
}

export const BITACORA_MODULO_IDS = Object.keys(BITACORA_MODULOS) as BitacoraModulo[]

/**
 * Módulos cuyos registros tienen sede y jornada. Administración es global y Comunicaciones (chat,
 * foros y actividades) cuelga del establecimiento del canal, sin sede (V565, ruta CANAL): ahí no se
 * filtra ni se muestra sede/jornada.
 */
export function moduloConSedeJornada(modulo: BitacoraModulo) {
  return modulo !== "ADMINISTRACION" && modulo !== "COMUNICACIONES"
}

export const BITACORA_ACCIONES = {
  CREAR: "Crear",
  MODIFICAR: "Modificar",
  CAMBIO_ESTADO: "Cambio de estado",
  ELIMINAR: "Eliminar",
  RESTAURACION: "Restauración",
  /** Consulta registrada (p. ej. la de quien no es el evaluador ni el evaluado, B.1.EVA.1). */
  CONSULTA: "Consulta",
  EXPORTAR: "Exportar",
  /** Solo en Administración del Sistema (B.7.LIS.1): inicios de sesión, bloqueos, cambios de contraseña… */
  ACCESO: "Acceso",
} as const

export type BitacoraAccion = keyof typeof BITACORA_ACCIONES

export const BITACORA_ACCION_IDS = Object.keys(BITACORA_ACCIONES) as BitacoraAccion[]

/** Acciones que se ofrecen en el filtro de un módulo: Acceso solo existe en Administración del Sistema. */
export function accionesDe(modulo: BitacoraModulo): BitacoraAccion[] {
  return BITACORA_ACCION_IDS.filter((a) => a !== "ACCESO" || modulo === "ADMINISTRACION")
}

/** Administración del Sistema con solo la acción Acceso: la tabla de accesos (B.7.LIS.1). */
export function esVistaAccesos(modulo: BitacoraModulo, acciones: string[]) {
  return modulo === "ADMINISTRACION" && acciones.length === 1 && acciones[0] === "ACCESO"
}

/** Datos de un evento Acceso (B.7.LIS.1). Pendiente de backend (`acceso` en la fila). */
export interface AccesoDatos {
  documento: string
  tipoCuenta: string
  /** «Inicio de sesión exitoso · perfil Funcionario», «Cuenta bloqueada», «Cambio de contraseña»… */
  evento: string
  ip: string | null
  navegador: string | null
}

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

/** El evento que deshizo una Restauración (B.1.DET.2). */
export interface EventoOriginal {
  fecha: string
  usuario: string
  rol: string | null
  sede: string | null
  accion: BitacoraAccion
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
  /**
   * Qué se hizo, en palabras del módulo que escribió (`app.etiqueta`, V571): "Agregar a Ana al
   * grupo Feria", "Actualización del funcionario …". `null` si no la dejó.
   */
  descripcion: string | null
  /** Columnas que cambiaron, sin nombre legible (los legibles vienen del estado). */
  campos: string[]
  motivo: string | null
  tipoRestauracion: TipoRestauracion | null
  motivoBloqueoEvento: string | null
  /** El registro sigue como lo dejó el evento. */
  vigente: boolean
  eventosPosteriores: EventoPosterior[]
  /** Solo en una Restauración: el evento que deshizo. Pendiente de backend (`evento_original`); sin él no se muestra. */
  eventoOriginal: EventoOriginal | null
  /** Solo en un evento Acceso. */
  acceso: AccesoDatos | null
  /**
   * Información reservada (B.4.LIS.1, B.1.EVA.2): la bitácora guarda quién y cuándo, no los valores. No se
   * muestran ni se restauran. Pendiente de backend (`reservado`); sin él, `false`.
   */
  reservado: boolean
}

/** Una fila del Resumen por módulo (B.1.LIS.1a): cuántos eventos de cada acción hubo en cada módulo. */
export interface BitacoraResumenFila {
  modulo: BitacoraModulo
  accion: BitacoraAccion
  cantidad: number
}

/** Lo que agrega `sso-admin /estado` para cada evento de la página. */
export interface BitacoraEstado {
  id: string
  cambios: BitacoraCambio[]
  vista: string | null
  /** Permisos de Guardar en la vista dueña (Regla 18) y catálogo. */
  puede: boolean
  motivoBloqueo: string | null
  /** Eliminar: cuándo y quién creó el registro (B.1.DET.1). Pendiente de backend (`creado`). */
  creado?: { fecha: string; por: string } | null
}

export interface BitacoraPagina {
  rows: BitacoraEvento[]
  totalCount: number
  pageCount: number
}
