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

export type Modalidad = "Presencial" | "Virtual" | "Mixta"

export type RecursoTipo = "URL" | "Unidad virtual" | "Archivo"

export interface Recurso {
  id: string
  titulo: string
  fuente: string
  tipo: RecursoTipo
  url: string
  descripcion: string
}

/**
 * Nivel intermedio de desempeño dentro de un criterio de rúbrica. Cada nivel
 * tiene un nombre (la etiqueta que aparece a la izquierda —estilo "Bueno",
 * "Aceptable"—) y una descripción opcional (lo que se muestra en el
 * textarea/Input a la derecha). Vacío si la rúbrica solo registra el nivel
 * "excelente" sin niveles intermedios.
 */
export interface Nivel {
  id: string
  nombre: string
  descripcion: string
}

export interface Criterio {
  id: string
  nombre: string
  excelente: string
  /** Niveles intermedios de desempeño (entre "bajo" y "excelente"). Vacío si
   *  la rúbrica solo tiene la descripción del nivel más alto. */
  niveles: Nivel[]
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

/**
 * Adaptación curricular aplicada a una actividad. Estructura de campos:
 * `tipo` y `aplicaA` son selects con `Seleccione` como placeholder;
 * `descripcion` es textarea con tope de 500 caracteres; `versionModificada`
 * es uno de cuatro valores ("no", "archivo", "enlace", "biblioteca") y
 * define qué campo auxiliar se muestra abajo:
 * - "no" → no muestra nada.
 * - "archivo" → `versionModificadaRef` carga el archivo local.
 * - "enlace" → `versionModificadaRef` es la URL.
 * - "biblioteca" → `versionModificadaRef` es el id de la plantilla elegida.
 */
export interface Adaptacion {
  tipo: string
  descripcion: string
  versionModificada: "no" | "archivo" | "enlace" | "biblioteca" | ""
  versionModificadaRef: string
  aplicaA: string
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
  /** Adaptaciones curriculares aplicadas a la actividad (lista editable). */
  adaptaciones: Adaptacion[]
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

/**
 * Formatos de exportación soportados por el endpoint. La etiqueta legible
 * se resuelve en el cliente desde `EXPORT_FORMAT_LABELS`, igual que en el
 * módulo de Cobertura.
 */
export type ExportFormat = "excel" | "pdf"

/**
 * Sobre genérico de las mutaciones que no devuelven un recurso sino un
 * resultado de operación (`export`, `delete`). El frontend decide qué
 * tostar leyendo `status` y `message`, así un mismo handler sirve para
 * las dos variantes (general y por id).
 */
export interface ExportResult {
  status: "ok" | "error"
  message: string
}

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  excel: "Excel",
  pdf: "PDF",
}