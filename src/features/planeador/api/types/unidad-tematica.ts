import type { ActividadStatus } from "@/features/planeador/api/types/actividad"

/**
 * Modelo de "Unidad temática" del Planeador — la agrupación pedagógica de la
 * que cuelgan las actividades. Es la segunda vista de la pantalla: mismo
 * listado a la izquierda, distinto contenido a la derecha.
 *
 * Comparte `ActividadStatus` con `Actividad` a propósito: es el mismo semáforo
 * y duplicarlo desincronizaría los colores entre las dos vistas.
 */

/** Cómo se combinan las notas de las actividades para dar la nota de la unidad. */
export type MetodoCalculo = "Ponderado" | "Promedio simple" | "Suma de puntos"

/**
 * Criterio de la rúbrica de la unidad. NO es el `Criterio` de `Actividad`: acá
 * el criterio se describe en los cuatro niveles de desempeño (una columna por
 * nivel en la tabla), mientras que el de la actividad solo guarda el nivel
 * "excelente" y una ponderación.
 */
export interface CriterioUnidad {
  id: string
  nombre: string
  bajo: string
  basico: string
  alto: string
  superior: string
}

/** Actividad vinculada a la unidad, con su peso dentro de ella. */
export interface UnidadActividad {
  id: string
  nombre: string
  /** "Formativa" | "Sumativa" — no es el `ActividadTipo` del otro modelo. */
  tipo: string
  instrumento: string
  grupo: string
  /** Peso dentro de la unidad, 0-100. */
  ponderacion: number
}

export interface UnidadTematica {
  id: string
  nombre: string
  /** Área/competencia — "Comunicativa", "Cognitiva"… */
  area: string
  status: ActividadStatus
  /** `yyyy-MM-dd`. */
  fechaInicio: string
  /** `yyyy-MM-dd`. */
  fechaFin: string
  descripcion: string
  objetivos: string[]
  contenidos: string[]
  metodoCalculo: MetodoCalculo
  grado: string
  asignatura: string
  criterios: CriterioUnidad[]
  actividades: UnidadActividad[]
}

/** Sobre que devuelve `QueryPathController`, igual que el de actividades. */
export interface UnidadTematicaQueryResponse {
  rows: UnidadTematica[]
  pageCount: number
  totalCount: number
}
