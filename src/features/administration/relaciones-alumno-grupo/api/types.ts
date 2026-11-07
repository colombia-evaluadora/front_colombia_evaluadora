/** Máximo de estudiantes por grupo de un nivel educativo y una zona (Sección 6.3). */
export interface RelacionAlumnoGrupo {
  pkRelacion: number
  pkNivel: number
  nivel: string
  pkZona: number
  zona: string
  maximo: number
}

export interface Opcion {
  value: string
  label: string
}

/** Forma de `fn_relalumnogrupo_listar`: relaciones y opciones de los selectores. */
export interface RelacionesAlumnoGrupo {
  relaciones: RelacionAlumnoGrupo[]
  niveles: Opcion[]
  /** Solo Urbana y Rural (lista ZONA). */
  zonas: Opcion[]
}

export const MAXIMO_MIN = 1
export const MAXIMO_MAX = 99
