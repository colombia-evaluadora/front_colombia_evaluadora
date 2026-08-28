/**
 * Modelo de "Actividad" del Planeador — un evento pedagógico con
 * identificación, programación, evaluación, recursos, rúbricas y seguimiento.
 *
 * Coexiste con `Establecimiento Educativo` (calendario académico) y con
 * `Periodos Académicos` (periodos de evaluación), pero es independiente: una
 * actividad es un evento puntual dentro de un periodo.
 *
 * Los nombres están en español para que coincidan con los textos de la UI
 * (los nombres de campo también —no se traducen— porque vienen del backend).
 */

export type ActividadStatus = "pending" | "in-progress" | "completed" | "cancelled"

export type ActividadTipo = "Proyecto" | "Taller" | "Evaluación" | "Actividad"

export type Modalidad = "Presencial" | "Virtual" | "Híbrida"

export type RecursoTipo = "URL" | "Sitio web"

export interface Recurso {
  id: string
  titulo: string
  fuente: string
  tipo: RecursoTipo
  url: string
  descripcion: string
}

export interface Criterio {
  id: string
  nombre: string
  excelente: string
  /** 0-100 */
  ponderacion: number
}

export interface Rubrica {
  id: string
  criterios: Criterio[]
}

export interface Unidad {
  id: string
  nombre: string
}

export interface Actividad {
  id: string
  nombre: string
  tipo: ActividadTipo
  unidad: Unidad
  asignatura: string
  grado: string
  grupo: string
  /** `yyyy-MM-dd`. */
  fechaInicio: string
  /** `yyyy-MM-dd`. */
  fechaCierre: string
  status: ActividadStatus
  /** Estudiantes ya evaluados en la actividad. */
  evaluados: number
  /** Total de estudiantes del grupo al que se asignó la actividad. */
  totalEstudiantes: number
  materiales: string
  recursos: Recurso[]
  duracionEstimada: string
  semana: number
  modalidad: Modalidad
  esEvaluativa: boolean
  instrumento: string
  generaEvidencias: boolean
  tipoEvidencia: string
  requiereValidacion: boolean
  observaciones: string
  contenidos: string[]
  objetivos: string[]
  descripcionUnidad: string[]
  rubrica: Rubrica
}

/**
 * Forma del sobre que devuelve `QueryPathController`. Hoy no se pagina — el
 * repositorio mock devuelve la lista entera — pero el tipo queda listo para
 * cuando llegue la paginación real del backend.
 */
export interface ActividadQueryResponse {
  rows: Actividad[]
  pageCount: number
  totalCount: number
}