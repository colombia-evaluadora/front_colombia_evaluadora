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
 * Tipo de actividad pedagógica — el `<Select>` del formulario
 * (`form-editar-actividad.tsx`) y el dropdown de filtros ofrecen lo que
 * traiga el catálogo real `TIPO_ACTIVIDAD` (`useTipoActividadCatalogQuery`),
 * que NO está acotado a un puñado de valores fijos: confirmado contra el
 * backend real, trae opciones como "Trabajo en clase" que no encajan en
 * ningún union corto — por eso es `string` y no un union literal.
 */
export type ActividadTipo = string

export type Modalidad = "Presencial" | "Virtual" | "Mixta"

export type RecursoTipo = "URL" | "Unidad virtual" | "Archivo"

export interface Recurso {
  id: number
  titulo: string
  fuente: string
  tipo: RecursoTipo
  url: string
  descripcion: string
  /**
   * `PK_TARCHIVO` de un material de tipo "Archivo" YA GUARDADO. Solo lo traen
   * los que vienen del backend: uno recién elegido en el formulario todavía
   * no está subido y viaja como blob URL en `url`.
   *
   * Sirve para dos cosas, y las dos importan:
   *
   * - **Guardar sin perderlo.** `PUT .../materiales` es de reemplazo total y
   *   exige `url` o `fkTarchivo`; sin este id, un archivo guardado se caería
   *   de la lista en el siguiente guardado.
   * - **Previsualizarlo.** Con el id se acuña el token de vista
   *   (`useArchivoViewUrl`) que da una URL servible a un `<img>`/`<video>`.
   */
  archivoId?: number
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
  /**
   * `PK_TARCHIVO` de una adaptación con `versionModificada === "archivo"` YA
   * GUARDADA — mismo rol que `Recurso.archivoId` y misma razón: `PUT
   * .../adaptaciones` es de reemplazo total y exige `fkTarchivo` cuando
   * `formatoAdaptacion = ARCHIVO`, así que sin este id el archivo se cae en
   * el siguiente guardado si el usuario no vuelve a elegirlo.
   */
  archivoId?: number
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
  /**
   * Ids de las evidencias (nivel 2 del referente curricular de la unidad,
   * `useUnidadReferenteQuery`) marcadas para esta actividad — solo tiene
   * sentido con `unidad.id !== 0`: una actividad huérfana no tiene de
   * dónde sacarlas. Se mandan en `POST /planeador/actividades` como
   * `EVIDENCIAS: [ids]` (colección Postman
   * `planeador-flujo-unidad-actividad`, paso 7); agregar una nueva a una
   * actividad ya creada usa `POST .../actividades/:id/evidencias` en vez
   * del PUT general (ver `agregar-evidencia-actividad.ts`).
   */
  evidenciasIds: number[]
  /**
   * Ids de criterios de la RÚBRICA DE LA UNIDAD (`UnidadTematica.criterios`,
   * `TCRITERIO_UNIDAD` — no la rúbrica propia de la actividad, `rubrica`)
   * marcados para relacionar con esta actividad — solo tiene sentido con
   * `unidad.id !== 0`. A diferencia de `evidenciasIds`, NO viaja en
   * `POST /planeador/actividades` (no confirmado en ese body): siempre es
   * `POST .../actividades/:id/criterios` aparte, con la actividad ya creada
   * (ver `agregar-criterio-unidad-actividad.ts`). Igual que `evidenciasIds`,
   * se precarga con lo ya relacionado (`fn_actividad_buscar_por_pk`, columna
   * `criterios`, ver `use-actividad-detalle-query.ts`) al reabrir el detalle
   * real — el checklist del form solo puede AGREGAR, no quitar por acá.
   */
  criteriosUnidadIds: number[]
  asignatura: string
  grado: string
  grupo: string
  /**
   * Etiqueta grado+grupo ya compuesta por el backend (`grado_grupo` real,
   * confirmado — colección Postman `planeador-delta-cambios`, punto 3): NO
   * es `grado + " " + grupo`, porque conviven dos convenciones de
   * `TGRUPO.NOMBRE` (el nombre ya trae el grado pegado, `"803M"`, o es solo
   * el consecutivo, `"01"`, con el código de grado a veces negativo en
   * Preescolar). Reemplaza al `pk_tactividad` que se mostraba antes por
   * error en la celda del calendario (`planeador-month-grid.tsx`).
   * `undefined` en el mock y en filas reales de antes de este cambio.
   */
  gradoGrupo?: string
  /** `PK_TASIGNATURA`/`PK_TGRADO`/`PK_TGRUPO` reales — solo se conocen
   *  cuando el docente ELIGE en los `<Select>` de "Grado / Grupo" y
   *  "Asignatura" (`useDocenteGruposQuery`/`useDocenteGradoAsignaturaQuery`,
   *  ver `AsignaturaGradoSection`). Igual que en `UnidadTematica`, si
   *  quedan `undefined` al editar, `update-actividad.ts` no manda
   *  `FK_TGRUPO`/`FK_TASIGNATURA` — el PUT real es parcial. */
  asignaturaId?: number
  gradoId?: number
  grupoId?: number
  /**
   * `PK_TMATRICULA` (no `Estudiante.id`/`PK_TESTUDIANTE`) de los
   * estudiantes elegidos a mano en "Estudiantes" — mutuamente excluyente
   * con `asignarTodoElGrupo` (ver ese campo). `fn_actividad_crear`/
   * `_actualizar` (V224) ya aceptan este array en `FK_TMATRICULAS`; el
   * padrón para elegirlos sale de `useActividadMatriculasGrupoQuery`.
   * Vacío mientras no se elige nadie a mano (`asignarTodoElGrupo` manda en
   * ese caso). Al editar una actividad existente, `use-actividad-detalle-
   * query.ts` la rellena con `row.estudiantes[].pkTmatricula` (V452,
   * confirmado real) — ya no arranca vacía asumiendo "todo el grupo".
   */
  matriculasIds: number[]
  /**
   * `true` (default) = `ASIGNAR_TODO_EL_GRUPO`, todas las matrículas
   * activas del grupo; `false` = solo `matriculasIds`. Es el comportamiento
   * de siempre (antes de que existiera "Estudiantes" en el form, toda
   * actividad nueva se asignaba a todo el grupo) hasta que el docente elige
   * al menos un estudiante puntual.
   */
  asignarTodoElGrupo: boolean
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
  /** Cantidad de minutos. `ProgramacionActividad.duracionEstimada.unidad`
   *  (`"BLOQUES"`) es la unidad de los TOPES de validación de ese otro
   *  endpoint, no la de este campo — no se usa para el label. Solo dígitos,
   *  sin la unidad. */
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
  esFormativa?: boolean
  instrumento: string
  /** Peso de la actividad en la nota final (0-100). Solo aplica —y solo se
   *  muestra en el form— cuando `esEvaluativa` es `true` Y la unidad calcula
   *  por "Ponderado": con "Promedio simple"/"Suma de puntos" este campo no
   *  se pide (ver `notaMaxima` para el caso de Sumatoria). */
  ponderacion: number
  /**
   * Puntaje máximo de la actividad, cuando la unidad calcula por "Suma de
   * puntos" (Sumatoria) — ahí no se reparte un %, se captura el puntaje y
   * el sistema calcula la ponderación resultante (`NOTA_MAXIMA` real, ver
   * `ActividadDetalleRow` en `use-actividad-detalle-query.ts`). Alternativa
   * a `ponderacion` (que es el campo de "Ponderado"), no coexisten: solo
   * una de las dos se pide según `metodoCalculo` de la unidad elegida.
   * `undefined` cuando no aplica, para no mandar un 0 con significado.
   */
  notaMaxima?: number
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
  /**
   * "Pintado dinámico" que ya trae el detalle real (`GET .../actividades/:id`,
   * el mismo bloque de `GET .../configuracion`, colección Postman 4.3/5.1):
   * qué campos mostrar/exigir, con el MOTIVO de cada decisión — el backend
   * ya resolvió TODAS las reglas de negocio (huérfana sin unidad, unidad
   * con referente FORMATIVO, etc.), así que el front no debe re-adivinarlas
   * armando su propia lógica a partir de grado/asignatura. Solo presente en
   * el backend real; `undefined` en mock/una actividad recién creada.
   */
  camposDisponibles?: {
    criterio: { visible: boolean; requerido: boolean; motivo: string }
    evaluacion: {
      visible: boolean
      requerido: boolean
      motivo: string
      instrumentosPermitidos: InstrumentoPermitido[]
    }
    ponderacion: { visible: boolean; requerido: boolean; motivo: string; modo: string | null }
    /**
     * La sección "Es una recuperación" del formulario — depende de DOS
     * gates: referente EVALUATIVO y `ES_EVALUATIVA <> 'N'` (una actividad de
     * recuperación debe ser evaluativa, `fn_actividad_recuperacion_
     * campos_disponibles`, V214.2/V440). `catalogos` va como
     * `{pk, valor, nombre}`: se decide por `valor` (`ACTIVIDAD`/
     * `NOTA_FINAL`, `PONDERADO`/…), los `pk` de `TLISTA_VALOR` no son
     * estables entre entornos. `reglas` expone las condicionales que valida
     * `fn_actividad_recuperacion_configurar` para no descubrirlas a base de
     * 400: actividad a recuperar obligatoria sii `destino = ACTIVIDAD`,
     * `valorPonderacion` obligatorio y 0-100 sii `tipoCalculo = PONDERADO`.
     */
    recuperacion: {
      visible: boolean
      requerido: boolean
      motivo: string
      catalogos: {
        destino: ListaValorOption[]
        tipoAplicacion: ListaValorOption[]
        tipoCalculo: ListaValorOption[]
      }
      reglas: {
        actividadRecuperarRequeridaSi: string
        valorPonderacionRequeridoSi: string
        valorPonderacionRango: { min: number; max: number }
      }
      /**
       * Solo llega con `?RECUPERAR=S` — la lista de "¿Qué desea recuperar?"
       * YA filtrada por el backend (sumativa, no es ella misma una
       * recuperación, activa, sin otra recuperación activa apuntándole).
       * `null` en cualquier otra consulta (sin `RECUPERAR=S`), no `[]`: así
       * se distingue "no se pidió" de "no hay ninguna recuperable".
       */
      actividadesRecuperables: ActividadRecuperable[] | null
    }
  }
  /**
   * Config de "Es una recuperación" — solo aplica con `esRecuperacion:
   * true`. Se manda como `RECUPERACION` JSONB al crear/editar
   * (`fn_actividad_recuperacion_configurar`); `destino/actividadId` son
   * obligatorios juntos (`destino: "ACTIVIDAD"` exige `actividadId`),
   * `tipoCalculo: "PONDERADO"` exige `valorPonderacion` (0-100).
   */
  recuperacionDestino: string
  recuperacionActividadId: number | undefined
  recuperacionTipoAplicacion: string
  recuperacionTipoCalculo: string
  recuperacionValorPonderacion: number | undefined
}

/** `{pk, valor, nombre}` — mismo shape que `instrumentosPermitidos`: se
 *  decide por `valor` (código estable de `TLISTA_VALOR`), `nombre` es solo
 *  para mostrar. */
export interface ListaValorOption {
  pk: number
  valor: string
  nombre: string
}

/** Sub-opción de un instrumento permitido (p. ej. el `tipoEscala` que admite
 *  ese `ESCALA_VALORACION` puntual) — mismo shape que `ListaValorOption`. */
export interface InstrumentoPermitidoVariante {
  pk: number
  valor: string
  nombre: string
}

export interface InstrumentoPermitidoCampoCatalogo {
  motivo: string
  requerido: boolean
  catalogo: ListaValorOption[]
}

/** Igual que `InstrumentoPermitidoCampoCatalogo`, pero cada opción del
 *  catálogo puede traer sus propias `variantes` (confirmado real:
 *  `metodoValoracion.catalogo[].variantes` — p. ej. `ESCALA_VALORACION`
 *  solo admite `NUMERICA` para un referente CUANTITATIVA). */
export interface InstrumentoPermitidoCampoMetodoValoracion {
  motivo: string
  requerido: boolean
  catalogo: (ListaValorOption & { variantes?: InstrumentoPermitidoVariante[] })[]
}

export interface InstrumentoPermitidoCampoTexto {
  campo: string
  motivo: string
  maxLength: number
  requerido: boolean
}

export interface InstrumentoPermitidoCampoBooleano {
  campo: string
  motivo: string
  default: "S" | "N"
  valores: ("S" | "N")[]
  requerido: boolean
}

export interface InstrumentoPermitidoCampoDefinicion {
  motivo: string
  requerido: boolean
  /** Forma esperada de `definicion` según el `metodoValoracion` elegido —
   *  claves `RUBRICA`/`LISTA_COTEJO`/`ESCALA_VALORACION`, valor: descripción
   *  de la forma (no un schema ejecutable, solo texto informativo). */
  formaPorMetodo: Record<string, string>
}

/**
 * Ficha dinámica del instrumento "Otro (personalizado)" (`valor: "OTRO"`,
 * confirmado real contra `GET /planeador/actividades/configuracion`) — los
 * demás instrumentos (Rúbrica/Lista de cotejo/Escala de valoración) no
 * tienen ficha propia, por eso `InstrumentoPermitido.campos` es `null` en
 * esos casos.
 */
export interface InstrumentoPermitidoCampos {
  tipoEvidencia: InstrumentoPermitidoCampoCatalogo
  metodoValoracion: InstrumentoPermitidoCampoMetodoValoracion
  definicion: InstrumentoPermitidoCampoDefinicion
  requiereArchivo: InstrumentoPermitidoCampoBooleano
  requiereTexto: InstrumentoPermitidoCampoBooleano
  descripcionInstrumento: InstrumentoPermitidoCampoTexto
}

/**
 * Una fila de `campos_disponibles.evaluacion.instrumentosPermitidos`
 * (confirmado real): YA NO es un array de strings — es un array de estos
 * objetos. Se decide por `valor` (código estable de `TLISTA_VALOR`,
 * "RUBRICA"/"LISTA_COTEJO"/"ESCALA_VALORACION"/"OTRO"), no por `etiqueta`/
 * `nombre` (ver `instrumentoPermitidoLabel`).
 */
export interface InstrumentoPermitido {
  pk: number
  valor: string
  nombre: string
  etiqueta: string
  variantes: InstrumentoPermitidoVariante[]
  campos: InstrumentoPermitidoCampos | null
}

/** Una fila de `campos_disponibles.recuperacion.actividadesRecuperables`
 *  (guía `planeador-recuperacion-actividad`, paso 2). */
export interface ActividadRecuperable {
  pk: number
  titulo: string
  fkTgrupo: number
  fkTunidad: number | null
  unidad: string | null
  fechaInicio: string
  fechaCierre: string
  estudiantesAsignados: number
}

/**
 * Placeholder cuando la respuesta todavía no trae el bloque `recuperacion`
 * de `campos_disponibles` (endpoint viejo, o mock sin el campo) — oculto y
 * sin catálogos, en vez de reventar por un `undefined`.
 */
export function defaultRecuperacionCampoDisponible(): NonNullable<
  Actividad["camposDisponibles"]
>["recuperacion"] {
  return {
    visible: false,
    requerido: false,
    motivo: "",
    catalogos: { destino: [], tipoAplicacion: [], tipoCalculo: [] },
    reglas: {
      actividadRecuperarRequeridaSi: "destino = ACTIVIDAD",
      valorPonderacionRequeridoSi: "tipoCalculo = PONDERADO",
      valorPonderacionRango: { min: 0, max: 100 },
    },
    actividadesRecuperables: null,
  }
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
