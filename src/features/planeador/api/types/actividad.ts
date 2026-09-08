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

/**
 * Tipos de actividad pedagógica que se pueden registrar en el Planeador.
 * El orden importa: es el mismo orden en que se muestran en el `<Select>` del
 * formulario (`form-editar-actividad.tsx`) y en el dropdown de filtros.
 */
export type ActividadTipo =
  | "Proyecto"
  | "Exposición"
  | "Práctica"
  | "Ensayo"
  | "Debate"
  | "Simulación"
  | "Otro"

export type Modalidad = "Presencial" | "Virtual" | "Mixta"

export type RecursoTipo = "URL" | "Unidad virtual" | "Archivo"

export interface Recurso {
  id: number
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
 *
 * `ponderacion` es el peso del nivel dentro del criterio cuando la
 * actividad es sumativa. Es opcional porque la captura del form solo lo
 * muestra si `actividad.esEvaluativa` es `true` (ver `CriterioItem`); en
 * una actividad no sumativa no aplica. Si está, se renderiza como un
 * input numérico al lado del textarea de descripción.
 */
export interface Nivel {
  id: number
  nombre: string
  descripcion: string
  ponderacion?: number
}

export interface Criterio {
  id: number
  nombre: string
  excelente: string
  /**
   * Peso de "Excelente" dentro del criterio, cuando la actividad es
   * sumativa — mismo campo que `Nivel.ponderacion`, pero "Excelente" no
   * vive en `niveles[]` (es el nivel más alto, first-class en el
   * criterio) así que necesita su propio field. Opcional por la misma
   * razón que el de los niveles: no aplica en una actividad formativa.
   */
  excelentePonderacion?: number
  /** Niveles intermedios de desempeño (entre "bajo" y "excelente"). Vacío si
   *  la rúbrica solo tiene la descripción del nivel más alto. */
  niveles: Nivel[]
  /** 0-100 */
  ponderacion: number
}

export interface Rubrica {
  id: number
  criterios: Criterio[]
}

/**
 * Ítem de una lista de cotejo. Estructura paralela a la rúbrica pero
 * más simple: no hay niveles intermedios ("Bueno"/"Aceptable"/...), solo
 * un `descripcion` por ítem y —opcionalmente, cuando la actividad es
 * sumativa— un `ponderacion`. El form lo muestra al lado del textarea
 * de descripción cuando `actividad.esEvaluativa` es `true`.
 */
export interface ListaCotejoItem {
  id: number
  descripcion: string
  ponderacion?: number
}

export interface ListaCotejo {
  id: number
  items: ListaCotejoItem[]
}

/** "Numérica" mide con un rango de valores (1-5, 1-10, …); "Cualitativa"
 *  mide con niveles nombrados (Excelente/Bueno/Aceptable/…). */
export type EscalaValoracionTipo = "Numérica" | "Cualitativa"

/**
 * Escala de valoración — alternativa a la rúbrica y a la lista de
 * cotejo cuando `instrumento === "Escala de valoración"`. Empieza con
 * un bloque de "Criterios generales" (qué se evalúa en general, y con
 * qué tipo de escala) y después se ramifica según `tipo`:
 * - "Numérica" → `valorMinimo`/`valorMaximo` + `interpretacionRangos`
 *   (un texto libre: qué significa cada tramo del rango).
 * - "Cualitativa" → `niveles` ("Definiciones cualitativas": Bajo/
 *   Medio/Alto/…, editable —a diferencia del nivel de un criterio de
 *   rúbrica, acá el `nombre` también es un input, no una etiqueta
 *   fija—). Reusa `Nivel.ponderacion`: cuando la actividad es sumativa,
 *   cada nivel pondera individualmente, al lado de su descripción —
 *   mismo patrón que los niveles intermedios de `CriterioItem`.
 */
export interface EscalaValoracion {
  id: number
  /** Texto libre separado por coma — ej. "Puntualidad, Participación". */
  criteriosGenerales: string
  tipo: EscalaValoracionTipo
  /** Solo aplica con `tipo === "Numérica"`. */
  valorMinimo?: number
  /** Solo aplica con `tipo === "Numérica"`. */
  valorMaximo?: number
  /** Solo aplica con `tipo === "Numérica"`. */
  interpretacionRangos: string
  /** Solo aplica con `tipo === "Cualitativa"`. */
  niveles: Nivel[]
}

/**
 * Definición de un instrumento de evaluación personalizado — alternativa a
 * `rubrica`, `listaCotejo` y `escalaValoracion` cuando
 * `instrumento === "Otro"`. Mismo criterio que esos tres: siempre presente
 * en el objeto (aunque venga vacío) para que el form no tenga que ramificar
 * por `undefined` al cambiar de instrumento.
 */
export interface InstrumentoPersonalizado {
  descripcion: string
  /** Valor corto ("Archivo", "Enlace", …); el label completo con ejemplos
   *  entre paréntesis vive en el `<Select>` del form. */
  tipoEvidenciaEsperada: string
  /** Mismas 3 opciones que `Actividad.instrumento` (menos "Otro": un
   *  instrumento personalizado no puede valorarse como "otro
   *  personalizado" de nuevo) — un instrumento a medida igual se valora
   *  siguiendo la lógica de uno de los tres estándar. */
  metodoValoracion: "Rúbrica" | "Lista de cotejo" | "Escala de valoración" | ""
  /** Los dos checkboxes son independientes entre sí y del select de
   *  arriba: pueden marcarse ambos, uno solo, o ninguno. */
  requiereArchivo: boolean
  requiereRespuestaTexto: boolean
}

export interface Unidad {
  id: number
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
 *
 * `estudiantesIds` solo aplica cuando `aplicaA === "Estudiantes
 * específicos"`: ids del grupo de la actividad (mismos `Estudiante.id`
 * que devuelve `useCalificacionesQuery`) que reciben la adaptación. Con
 * "A todo el grupo" queda vacío — no hace falta elegir a nadie.
 */
export interface Adaptacion {
  tipo: string
  descripcion: string
  versionModificada: "no" | "archivo" | "enlace" | "biblioteca" | ""
  versionModificadaRef: string
  aplicaA: string
  estudiantesIds: number[]
}

export interface Actividad {
  id: number
  nombre: string
  tipo: ActividadTipo
  /**
   * Si la actividad es una recuperación (repetición de una evaluación
   * sumativa previa). Solo tiene sentido —y solo se muestra en el
   * form, arriba de todo— cuando `esEvaluativa` es `true`: una
   * actividad formativa no se "recupera", no pondera nota.
   */
  esRecuperacion: boolean
  unidad: Unidad
  asignatura: string
  grado: string
  grupo: string
  /** `PK_TASIGNATURA`/`PK_TGRADO`/`PK_TGRUPO` reales — solo se conocen
   *  cuando el docente ELIGE en los `<Select>` de "Grado / Grupo" y
   *  "Asignatura" (`useDocenteGruposQuery`/`useDocenteGradoAsignaturaQuery`,
   *  ver `AsignaturaGradoSection`). Igual que en `UnidadTematica`, si
   *  quedan `undefined` al editar, `update-actividad.ts` no manda
   *  `FK_TGRUPO`/`FK_TASIGNATURA` — el PUT real es parcial. */
  asignaturaId?: number
  gradoId?: number
  grupoId?: number
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
  /** Cantidad de horas o sesiones (solo dígitos, sin la unidad). */
  duracionEstimada: string
  /**
   * Semana del cronograma en la que corre la actividad. Es `string` y no
   * `number` porque el calendario institucional no siempre es "una sola
   * semana" — una actividad puede cubrir un rango (`"10-12"`). El form
   * restringe la entrada a un número o ese rango simple (ver
   * `toDigitsOrRangeInput` en `text-input.ts`); el backend real lo
   * validará contra el cronograma del periodo cuando exista el endpoint
   * de update.
   */
  semana: string
  modalidad: Modalidad
  /** Si la actividad es sumativa (pondera/suma a la nota final) o no. */
  esEvaluativa: boolean
  instrumento: string
  /** Peso de la actividad en la nota final (0-100). Solo aplica —y solo se
   *  muestra en el form— cuando `esEvaluativa` es `true`: una actividad no
   *  sumativa no pondera nada. */
  ponderacion: number
  generaEvidencias: boolean
  tipoEvidencia: string
  requiereValidacion: boolean
  observaciones: string
  contenidos: string[]
  objetivos: string[]
  descripcionUnidad: string[]
  rubrica: Rubrica
  /**
   * Lista de cotejo — alternativa a la rúbrica cuando
   * `instrumento === "Lista de cotejo"`. Es un field opcional del form
   * porque solo se renderiza la sección correspondiente si el usuario
   * eligió ese instrumento (el otro instrumento, "Rúbrica", consume
   * `rubrica`). El backend real lo devolverá solo si aplica; mientras
   * tanto el mock lo trae poblado para todas las actividades para que
   * la lista siempre exista en memoria y se pueda pasar a edición.
   */
  listaCotejo: ListaCotejo
  /**
   * Escala de valoración cualitativa — alternativa a `rubrica` y a
   * `listaCotejo` cuando `instrumento === "Escala de valoración"`.
   * Mismo criterio que los otros dos: siempre presente en el objeto
   * (aunque venga vacía) para que el form no tenga que ramificar por
   * `undefined` al cambiar de instrumento.
   */
  escalaValoracion: EscalaValoracion
  /**
   * Instrumento personalizado — alternativa a `rubrica`, `listaCotejo` y
   * `escalaValoracion` cuando `instrumento === "Otro"`. Mismo criterio que
   * los otros tres: siempre presente en el objeto, aunque venga vacío.
   */
  instrumentoPersonalizado: InstrumentoPersonalizado
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