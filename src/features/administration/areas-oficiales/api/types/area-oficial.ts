/** Envoltura de las funciones del catálogo: `SELECT fn(...) AS resultado`. */
export interface Resultado<T> {
  resultado: T
}

export interface NivelAreaOficial {
  /** pk de `TNIVEL_ENSENANZA`. */
  pkNivel: number
  codigo: string
  nombre: string
}

/**
 * Área oficial = fila de área (`CODIGO_ASIGNATURA = 0`) de `TAREA_ASIGNATURA`,
 * el catálogo de «áreas de ley» de siempre (V314). Las asignaturas de catálogo
 * que cuelgan de ella (Aritmética → Matemáticas) no se gestionan acá.
 */
export interface AreaOficial {
  pkAreaOficial: number
  nombre: string
  /** Estado: inactiva deja de ofrecerse en los selectores; lo asociado la conserva. */
  habilitada: boolean
  /** Marca «Dimensión transversal de Preescolar» (Dimensiones). */
  esDimensionTransversal: boolean
  /** Especialidad de origen del catálogo MEN (null en las creadas acá). */
  especialidad: string | null
  niveles: NivelAreaOficial[]
  usos: { planesEstudio: number; referentes: number }
  /** Con usos no se puede eliminar, solo inactivar. */
  enUso: boolean
}

/** Opción de los selectores (`GET /catalogos/areas-oficiales`): solo activas. */
export interface AreaOficialOpcion {
  pkAreaOficial: number
  nombre: string
  esDimensionTransversal: boolean
}

/** Texto del requerimiento: se muestra donde iría "Eliminar". */
export const AREA_EN_USO_MENSAJE =
  "En uso en [Áreas] de Planes de Estudio y en Referentes: no se puede eliminar."

export const DIMENSION_TRANSVERSAL_LABEL = "Dimensión transversal de Preescolar"
