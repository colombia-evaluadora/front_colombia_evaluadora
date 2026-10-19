/** Submódulos de la Bitácora: uno por módulo auditado (Administración del Sistema, §12.2). */
export const BITACORA_MODULOS = {
  establecimiento: { nombre: "Establecimiento", entidades: ["Establecimiento", "Sede", "Funcionario", "Rol asignado", "Período académico"] },
  cobertura: { nombre: "Cobertura Educativa", entidades: ["Matrícula", "Reserva de cupo", "Inscripción", "Convocatoria"] },
  "gestion-academica": { nombre: "Gestión Académica", entidades: ["Actividad", "Calificación", "Asistencia", "Referente curricular"] },
  "gestion-estudiantil": { nombre: "Gestión Estudiantil", entidades: ["Anotación", "Caso de convivencia", "Citación", "PIAR"] },
  administracion: { nombre: "Administración del Sistema", entidades: ["Lista de valores", "Área oficial", "Vista por rol", "Criterio de prioridad", "Parámetro de edad", "Superadministrador"] },
} as const

export type BitacoraModulo = keyof typeof BITACORA_MODULOS

export const BITACORA_MODULO_IDS = Object.keys(BITACORA_MODULOS) as BitacoraModulo[]

export const BITACORA_ACCIONES = [
  "Crear",
  "Modificar",
  "Cambio de estado",
  "Eliminar",
  "Restauración",
] as const

export type BitacoraAccion = (typeof BITACORA_ACCIONES)[number]

export interface BitacoraCambio {
  campo: string
  anterior: string | null
  nuevo: string | null
  /** Valor que tiene hoy el campo; si difiere de `nuevo`, hubo cambios después. */
  actual?: string | null
}

/** Un evento inmutable de la bitácora. */
export interface BitacoraEvento {
  id: number
  fecha: Date
  usuario: { nombre: string; documento: string; rol: string }
  sede: string | null
  jornada: string | null
  entidad: string
  registro: string
  accion: BitacoraAccion
  /** Todos los campos que cambiaron en el mismo evento. */
  cambios: BitacoraCambio[]
  /** Eventos que cambiaron los mismos campos después de este. */
  posteriores?: string[]
  /** Vista que gestiona el registro (para el aviso de no restaurable). */
  vista: string
  /** Solo en eventos Restauración. */
  motivo?: string
}

export type TipoRestauracion = "Restaurar valor" | "Recuperar registro eliminado"

/** Qué restauración admite un evento, o por qué no (Regla 18). */
export function restauracionDe(
  e: BitacoraEvento,
): { tipo: TipoRestauracion } | { motivo: string; correccion: string } {
  if (e.usuario.nombre === "Sistema")
    return { motivo: "es un cambio hecho por Sistema", correccion: "corregirlo" }
  if (e.accion === "Modificar") return { tipo: "Restaurar valor" }
  if (e.accion === "Eliminar") return { tipo: "Recuperar registro eliminado" }
  if (e.accion === "Cambio de estado")
    return { motivo: "es un cambio de estado con efectos de ciclo de vida", correccion: "revertirlo" }
  if (e.accion === "Restauración")
    return { motivo: "es un registro de la propia bitácora", correccion: "deshacerlo" }
  return { motivo: "la creación no se restaura", correccion: "quitar el registro" }
}
