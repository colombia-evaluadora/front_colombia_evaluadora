import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { env } from "@/config/env"
import { estadoDerivadoToStatus } from "@/features/planeador/lib/estado-derivado"
import { fetchTipoRecursoOptions, type TipoRecursoOption } from "@/features/planeador/api/query/use-tipo-recurso-catalog"
import { fetchTipoAdaptacionOptions, type TipoAdaptacionOption } from "@/features/planeador/api/query/use-tipo-adaptacion-catalog"
import { fetchAplicaAOptions, type AplicaAOption } from "@/features/planeador/api/query/use-aplica-a-catalog"
import { normalizeInstrumentosPermitidos } from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"
import {
  defaultRecuperacionCampoDisponible,
  type Actividad,
  type ActividadRecuperable,
  type Adaptacion,
  type ListaValorOption,
  type Recurso,
  type RecursoTipo,
} from "@/features/planeador/api/types/actividad"

/**
 * `GET /planeador/actividades/:id` (confirmado real, colección Postman
 * `planeador-guia-completa`, 4.3). Fila COMPLETAMENTE distinta del mock:
 * escalares sueltos (no objetos anidados), `unidad`/`fk_tunidad` en `null`
 * cuando la actividad no tiene unidad (no un objeto `{id, nombre}` —
 * accederle `.nombre` directo, como hacía `detail-sections.tsx`, revienta
 * con "Cannot read properties of null"), y trae `campos_disponibles`/
 * `unidad_configuracion` (el mismo bloque de "pintado dinámico" de
 * `GET .../configuracion`, carpeta 5). `campos_disponibles` SÍ se mapea
 * (`Actividad.camposDisponibles`, ver `EvaluacionSection` en
 * `form-editar-actividad.tsx`, que lo usa para actividades huérfanas en vez
 * de re-derivar la regla con `referente-curricular`); `unidad_configuracion`
 * queda sin usar todavía.
 *
 * Ojo con lo que esta fila NO trae: ni rastro de `rubrica`/`listaCotejo`/
 * `escalaValoracion` — el instrumento de la actividad vive en
 * `GET .../actividades/:id/instrumento` (`use-instrumento-actividad-query.ts`,
 * ya real), no en el detalle. Acá quedan en placeholder vacío, igual que ya
 * hace `use-actividades-mias-query.ts` con el resumen del listado.
 */
interface ActividadDetalleRow {
  pk_tactividad: number
  titulo: string
  descripcion: string | null
  fk_tasignatura: number | null
  asignatura: string | null
  fk_tunidad: number | null
  unidad: string | null
  fk_tgrupo: number | null
  grupo: string | null
  /** Confirmado real (colección Postman `planeador-delta-cambios`, punto
   *  3.3): antes el detalle NO traía el grado de la actividad (solo
   *  `fk_tgrupo`) — `AsignaturaGradoSection` en `form-editar-actividad.tsx`
   *  lo resolvía cruzando `grupoId` contra el catálogo del propio docente
   *  como workaround. Ahora llega directo; ese cruce queda como respaldo
   *  para una actividad de un grupo que el docente autenticado no dicta. */
  fk_tgrado: number | null
  grado: string | null
  grado_codigo: string | null
  grado_grupo: string | null
  fk_tlv_tipo_actividad: number | null
  tipo_actividad: string | null
  fk_tlv_jerarquia: number | null
  jerarquia: string | null
  fk_tlv_modalidad: number | null
  modalidad: string | null
  fk_tlv_instrumento_evaluacion: number | null
  instrumento_evaluacion: string | null
  descripcion_instrumento: string | null
  fk_tlv_tipo_evidencia: number | null
  tipo_evidencia: string | null
  fk_tlv_metodo_valoracion: number | null
  metodo_valoracion: string | null
  fk_tlv_tipo_calculo: number | null
  tipo_calculo: string | null
  ponderacion: number | null
  influencia: unknown
  nota_maxima: number | null
  // Datetime ISO completo, no `yyyy-MM-dd` plano — mismo patrón confirmado
  // en el resto del Planeador real.
  fecha_inicio: string
  fecha_cierre: string
  fecha_calificado: string | null
  fecha_publicacion: string | null
  duracion_estimada: number | string | null
  semana_cronograma: string | null
  material_requerido: string | null
  es_evaluativa: "S" | "N"
  es_formativa: boolean | null
  es_recuperacion: "S" | "N"
  requiere_archivo: "S" | "N"
  requiere_texto: "S" | "N"
  genera_evidencias: "S" | "N"
  requiere_validacion_coordinador: "S" | "N"
  observaciones_docente: string | null
  estado: string
  estudiantes_asignados: number
  estudiantes_evaluados: number
  materiales: unknown[]
  adaptaciones: unknown[]
  /** Config de recuperación YA guardada de esta actividad — distinta de
   *  `campos_disponibles.recuperacion`, que es el catálogo/reglas para
   *  ARMAR el formulario. `null` cuando no es de recuperación. */
  recuperacion: RecuperacionGuardadaRow | null
  // `fn_actividad_buscar_por_pk` (V224/V440): evidencias/criterios YA
  // relacionados con esta actividad, con el pk de la RELACIÓN (no el del
  // enunciado/criterio) — es el mismo pk que exige
  // `PATCH .../evidencias/:id` / `PATCH .../criterios/:id` para quitarlos.
  evidencias: EvidenciaRelacionadaRow[] | null
  criterios: CriterioRelacionadoRow[] | null
  // `fn_actividad_buscar_por_pk` (V452, confirmado real): las matrículas YA
  // asignadas (`TACTIVIDAD_ESTUDIANTE` activas), con `pkTmatricula` — el
  // mismo id que `matriculasIds`/`EstudiantesMultiSelect` manejan. Antes se
  // asumía que no había forma de leer esto de vuelta y el form arrancaba
  // siempre en "Todo el grupo" al editar (ver `toActividad` abajo).
  estudiantes: EstudianteAsignadoRow[] | null
  campos_disponibles: CamposDisponiblesRow | null
  unidad_configuracion: unknown
  active: boolean
}

interface EvidenciaRelacionadaRow {
  pk: number
  fkReferenteEnunciado: number
  texto: string
  fkPadre: number | null
  textoPadre: string | null
}

interface CriterioRelacionadoRow {
  pk: number
  fkTcriterioUnidad: number
  descripcion: string
  codigo: string | null
  orden: number
}

/** Confirmado contra una respuesta real de test (actividad 23):
 *  `{estudiante, calificable, observacion, calificacion, pkTmatricula,
 *  fkTestudiante, pkTactividadEstudiante}` — acá solo hace falta
 *  `pkTmatricula`, el resto lo maneja la planilla de calificación. */
interface EstudianteAsignadoRow {
  pkTactividadEstudiante: number
  pkTmatricula: number
  fkTestudiante: number
  estudiante: string | null
  calificacion: number | null
  calificable: "S" | "N"
  observacion: string | null
}

/**
 * `fn_actividad_buscar_por_pk` (V224): "objeto con destino/tipoAplicacion/
 * tipoCalculo/valorPonderacion + nombres resueltos, o NULL si no es de
 * recuperación" (documentado en el comentario de la función), pero sin un
 * ejemplo real capturado de los nombres EXACTOS de sus campos. Se asume el
 * mismo patrón `*Valor` (código estable de `TLISTA_VALOR`) que ya usa
 * `evaluacion.instrumentosPermitidos`/`ponderacion.modo` en este mismo
 * bloque — lectura tolerante (`??`) para no romper si el nombre real
 * difiere una vez se confirme contra una respuesta real.
 */
interface RecuperacionGuardadaRow {
  pk: number
  destino?: string | null
  destinoValor?: string | null
  fkActividadRecuperar: number | null
  tipoAplicacion?: string | null
  tipoAplicacionValor?: string | null
  tipoCalculo?: string | null
  tipoCalculoValor?: string | null
  valorPonderacion: number | null
}

/** Confirmado contra una respuesta real (actividad huérfana, sin unidad):
 *  `evaluacion.visible: false` con motivo "La actividad no tiene unidad
 *  relacionada" — el backend ya resuelve ahí "¿corresponde mostrar/exigir
 *  esto?" con las reglas de negocio completas (huérfana, unidad con
 *  referente FORMATIVO, etc.), no solo un derivado de grado/asignatura. */
interface CampoDisponibleRow {
  visible: boolean
  requerido: boolean
  motivo: string
}

interface RecuperacionCampoDisponibleRow {
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
  /** Este endpoint (detalle de una actividad existente) nunca manda
   *  `?RECUPERAR=S` — no hay "¿qué desea recuperar?" que pintar acá,
   *  siempre `null`/ausente. Ver `ActividadRecuperable` en
   *  `use-configuracion-actividad-query.ts`, que sí lo trae. */
  actividadesRecuperables?: ActividadRecuperable[] | null
}

interface CamposDisponiblesRow {
  criterio: CampoDisponibleRow
  /** `instrumentosPermitidos` viene como `{pk, valor, etiqueta, nombre,
   *  variantes, campos}[]`, no `string[]` — ver `normalizeInstrumentosPermitidos`. */
  evaluacion: CampoDisponibleRow & {
    instrumentosPermitidos: Parameters<typeof normalizeInstrumentosPermitidos>[0]
  }
  ponderacion: CampoDisponibleRow & { modo: string | null }
  recuperacion?: RecuperacionCampoDisponibleRow
}

function toDateOnly(value: string | null): string {
  return value ? value.slice(0, 10) : ""
}

/**
 * Ids de las evidencias (nivel 2, `PK_REFERENTE_ENUNCIADO`) ya marcadas
 * para ESTA actividad — antes no había ejemplo real de qué campo lo
 * confirmaba y quedaba fijo en `[]`; ahora `fn_actividad_buscar_por_pk`
 * (V224/V440) trae la columna `evidencias` con el pk de la RELACIÓN
 * (`TACTIVIDAD_EVIDENCIA`) y `fkReferenteEnunciado` (el id real de la
 * evidencia, que es lo que compara el checklist).
 */
function evidenciasIdsFromRow(raw: EvidenciaRelacionadaRow[] | null): number[] {
  return (raw ?? []).map((evidencia) => evidencia.fkReferenteEnunciado)
}

/**
 * Igual que `evidenciasIdsFromRow`, pero para los criterios de la rúbrica
 * de la unidad (`TACTIVIDAD_CRITERIO_UNIDAD`, columna `criterios` de
 * `fn_actividad_buscar_por_pk`).
 */
function criteriosUnidadIdsFromRow(raw: CriterioRelacionadoRow[] | null): number[] {
  return (raw ?? []).map((criterio) => criterio.fkTcriterioUnidad)
}

/** Completa `recuperacion` con el placeholder oculto cuando la fila no lo
 *  trae (ver `defaultRecuperacionCampoDisponible`), y normaliza
 *  `instrumentosPermitidos` a la forma rica del form (ver
 *  `normalizeInstrumentosPermitidos`). */
function toCamposDisponibles(raw: CamposDisponiblesRow | null): Actividad["camposDisponibles"] {
  if (!raw) return undefined
  return {
    ...raw,
    evaluacion: {
      ...raw.evaluacion,
      instrumentosPermitidos: normalizeInstrumentosPermitidos(raw.evaluacion.instrumentosPermitidos),
    },
    recuperacion: raw.recuperacion
      ? { ...raw.recuperacion, actividadesRecuperables: raw.recuperacion.actividadesRecuperables ?? null }
      : defaultRecuperacionCampoDisponible(),
  }
}

/**
 * Cada material del detalle. La forma está confirmada contra
 * `fn_actividad_buscar_por_pk` en el servidor:
 *
 * ```
 * {pk, orden, tipoRecurso, url, fkTarchivo, descripcion}
 * ```
 *
 * Se sigue leyendo de forma tolerante (probando la variante `snake_case`)
 * porque es el criterio del resto de esta fila, pero ya no es a ciegas.
 *
 * Un material de tipo "Archivo" trae `fkTarchivo` en vez de `url`: el
 * backend exige exactamente uno de los dos. Ese id es lo que después
 * permite reenviarlo al guardar sin volver a subirlo y previsualizarlo con
 * un token de vista. El NOMBRE del archivo no viene acá — lo completa
 * `fetchMaterialArchivos` (V427), que es de donde sale la extensión.
 */
function recursoFromMaterialRaw(raw: unknown, tipoRecursoOptions: TipoRecursoOption[], index: number): Recurso {
  const item = (raw ?? {}) as Record<string, unknown>
  const tipoRaw = item.tipoRecurso ?? item.tipo_recurso
  let tipo: RecursoTipo = "URL"
  if (typeof tipoRaw === "number") {
    tipo = tipoRecursoOptions.find((option) => option.id === tipoRaw)?.tipo ?? "URL"
  } else if (typeof tipoRaw === "string") {
    const lower = tipoRaw.toLowerCase()
    if (lower.includes("archivo")) tipo = "Archivo"
    else if (lower.includes("virtual") || lower.includes("repositorio")) tipo = "Unidad virtual"
  }
  const url = item.url ?? item.URL
  const descripcion = item.descripcion ?? item.DESCRIPCION
  const pk = item.pk ?? item.pk_tactividad_material
  const archivoId = item.fkTarchivo ?? item.fk_tarchivo
  return {
    // El `pk` del material sirve de key estable; el índice queda de respaldo
    // para un backend que no lo mande (el mock, por ejemplo).
    id: typeof pk === "number" ? pk : index,
    titulo: "",
    fuente: "",
    tipo,
    url: typeof url === "string" ? url : "",
    descripcion: typeof descripcion === "string" ? descripcion : "",
    ...(typeof archivoId === "number" ? { archivoId } : {}),
  }
}

/** Fila de `GET /planeador/actividades/:id/materiales/archivos` (V427). */
interface MaterialArchivoRow {
  pk_tactividad_material: number
  fk_tarchivo: number
  nombre: string
  extension: string | null
  peso: number
}

/**
 * Nombre de cada archivo de los materiales, por `fk_tarchivo`.
 *
 * Va en una llamada aparte porque el detalle devuelve el id del archivo pero
 * no su nombre, y sin nombre no hay extensión: ni se puede rotular la fila
 * ni se puede decidir si la vista previa es una imagen, un audio, un video o
 * un PDF. Ver la cabecera de V427 para por qué se resolvió así y no
 * agregando la clave al detalle.
 *
 * Nunca hace fallar la carga de la actividad: si esta llamada se cae, los
 * materiales se muestran igual, solo que sin nombre.
 */
async function fetchMaterialArchivos(id: number): Promise<Map<number, string>> {
  try {
    const rows = await evalCol.getRows<MaterialArchivoRow>(
      `/planeador/actividades/${id}/materiales/archivos`,
    )
    return new Map(rows.map((row) => [row.fk_tarchivo, nombreConExtension(row)]))
  } catch {
    return new Map()
  }
}

/**
 * El nombre con el que se muestra y se clasifica el archivo.
 *
 * `TARCHIVO.NOMBRE` casi siempre trae la extensión (446.098 de 480.002 filas
 * activas), pero las históricas migradas no — y sin sufijo la vista previa no
 * puede saber si es un PDF o una foto. Para esas, el backend ya resolvió la
 * extensión desde la clave del objeto y la manda aparte: se la pegamos acá.
 *
 * Se pega al nombre en vez de viajar como un campo aparte porque el nombre es
 * justamente de donde el resolver saca el tipo, y porque mostrar
 * "guia2compsocioemo10°.pdf" en la lista dice más que el nombre pelado.
 */
function nombreConExtension(row: MaterialArchivoRow): string {
  const yaTiene = /\.[A-Za-z0-9]{2,5}$/.test(row.nombre)
  if (yaTiene || !row.extension) return row.nombre
  return `${row.nombre}.${row.extension}`
}

/**
 * `row.adaptaciones` tiene el mismo problema que `row.materiales`: sin
 * ejemplo real con datos, pero el confirmado body de
 * `PUT .../adaptaciones` (`update-adaptaciones-actividad.ts`) da la mejor
 * pista de sus campos: `{tipoAdaptacion, descripcion, usaVersionModificada,
 * aplicaA}`. Se lee tolerando `snake_case` igual que los materiales.
 *
 * `versionModificadaRef`/`estudiantesIds` NO tienen campo confirmado ni
 * para guardar ni para leer (mismo gap documentado en
 * `update-adaptaciones-actividad.ts`) — quedan vacíos en vez de inventar en
 * cuál de los tres tipos ("archivo"/"enlace"/"biblioteca") cayó, que sería
 * peor que no mostrar nada.
 */
function adaptacionFromRaw(
  raw: unknown,
  tipoAdaptacionOptions: TipoAdaptacionOption[],
  aplicaAOptions: AplicaAOption[],
): Adaptacion {
  const item = (raw ?? {}) as Record<string, unknown>
  const tipoRaw = item.tipoAdaptacion ?? item.tipo_adaptacion
  const tipo =
    typeof tipoRaw === "number"
      ? (tipoAdaptacionOptions.find((option) => option.id === tipoRaw)?.tipo ?? "")
      : typeof tipoRaw === "string"
        ? tipoRaw
        : ""
  const descripcionRaw = item.descripcion ?? item.DESCRIPCION
  const aplicaRaw = item.aplicaA ?? item.aplica_a
  const aplicaA =
    typeof aplicaRaw === "number"
      ? (aplicaAOptions.find((option) => option.id === aplicaRaw)?.valor ?? "")
      : typeof aplicaRaw === "string"
        ? aplicaRaw
        : ""
  return {
    tipo,
    descripcion: typeof descripcionRaw === "string" ? descripcionRaw : "",
    // `usaVersionModificadaRaw === "S"` solo dice que SÍ hay una versión
    // modificada, no cuál de las tres variantes ("archivo"/"enlace"/
    // "biblioteca") — mostrar cualquiera de ellas fijo sería afirmar un
    // dato que no se tiene, así que se deja en "no" (sin el campo auxiliar)
    // en vez de arriesgar el tipo equivocado.
    versionModificada: "no",
    versionModificadaRef: "",
    aplicaA,
    estudiantesIds: [],
  }
}

function toActividadDetalle(
  row: ActividadDetalleRow,
  tipoRecursoOptions: TipoRecursoOption[],
  tipoAdaptacionOptions: TipoAdaptacionOption[],
  aplicaAOptions: AplicaAOption[],
): Actividad {
  return {
    id: row.pk_tactividad,
    nombre: row.titulo,
    tipo: row.tipo_actividad ?? "Otro",
    esRecuperacion: row.es_recuperacion === "S",
    recuperacionDestino: row.recuperacion?.destino ?? row.recuperacion?.destinoValor ?? "",
    recuperacionActividadId: row.recuperacion?.fkActividadRecuperar ?? undefined,
    recuperacionTipoAplicacion:
      row.recuperacion?.tipoAplicacion ?? row.recuperacion?.tipoAplicacionValor ?? "",
    recuperacionTipoCalculo: row.recuperacion?.tipoCalculo ?? row.recuperacion?.tipoCalculoValor ?? "",
    recuperacionValorPonderacion: row.recuperacion?.valorPonderacion ?? undefined,
    // `unidad`/`fk_tunidad` vienen `null` (no un objeto) cuando la
    // actividad es huérfana — `{id: 0, nombre: ""}` es el sentinel que ya
    // usa el resto del front para "sin unidad".
    unidad:
      row.fk_tunidad != null
        ? { id: row.fk_tunidad, nombre: row.unidad ?? "" }
        : { id: 0, nombre: "" },
    evidenciasIds: evidenciasIdsFromRow(row.evidencias),
    criteriosUnidadIds: criteriosUnidadIdsFromRow(row.criterios),
    asignatura: row.asignatura ?? "",
    grado: row.grado ?? "",
    gradoId: row.fk_tgrado ?? undefined,
    grupo: row.grupo ?? "",
    gradoGrupo: row.grado_grupo ?? undefined,
    fechaInicio: toDateOnly(row.fecha_inicio),
    fechaCierre: toDateOnly(row.fecha_cierre),
    status: estadoDerivadoToStatus(row.estado),
    evaluados: row.estudiantes_evaluados,
    totalEstudiantes: row.estudiantes_asignados,
    materiales: row.material_requerido ?? "",
    recursos: row.materiales.map((raw, index) => recursoFromMaterialRaw(raw, tipoRecursoOptions, index)),
    duracionEstimada: row.duracion_estimada != null ? String(row.duracion_estimada) : "",
    semana: row.semana_cronograma ?? "",
    modalidad: (row.modalidad ?? "Presencial") as Actividad["modalidad"],
    esEvaluativa: row.es_evaluativa === "S",
    esFormativa: row.es_formativa === true,
    // "Otro (personalizado)" se normaliza al código corto "Otro": el resto
    // del form (InstrumentoEvaluacionSection, la propia SelectItem de este
    // campo) compara `instrumento === "Otro"`, no el nombre completo que
    // manda el backend (`instrumento_evaluacion`). Rúbrica/Lista de cotejo/
    // Escala de valoración no necesitan este ajuste porque, a diferencia de
    // "Otro", su nombre completo YA es igual al código corto interno — acá
    // el desajuste hacía que una actividad con instrumento "Otro" recién
    // abierta cayera siempre en la sección de Rúbrica genérica (el `else`
    // por defecto), sin mostrar "Definición del instrumento personalizado"
    // ni el método/definición ya guardados, aunque el detalle sí los
    // trajera completos.
    instrumento: row.instrumento_evaluacion?.startsWith("Otro") ? "Otro" : (row.instrumento_evaluacion ?? ""),
    ponderacion: row.ponderacion ?? 0,
    notaMaxima: row.nota_maxima ?? undefined,
    generaEvidencias: row.genera_evidencias === "S",
    tipoEvidencia: row.tipo_evidencia ?? "",
    requiereValidacion: row.requiere_validacion_coordinador === "S",
    observaciones: row.observaciones_docente ?? "",
    contenidos: [],
    objetivos: [],
    descripcionUnidad: [],
    // El instrumento de la actividad vive aparte (`use-instrumento-actividad-query.ts`)
    // — ver nota arriba.
    rubrica: { id: 0, criterios: [] },
    listaCotejo: { id: 0, items: [] },
    escalaValoracion: {
      id: 0,
      criteriosGenerales: "",
      tipo: "Numérica",
      interpretacionRangos: "",
      niveles: [],
    },
    instrumentoPersonalizado: {
      descripcion: "",
      tipoEvidenciaEsperada: "",
      metodoValoracion: "",
      requiereArchivo: row.requiere_archivo === "S",
      requiereRespuestaTexto: row.requiere_texto === "S",
    },
    adaptaciones: row.adaptaciones.map((raw) => adaptacionFromRaw(raw, tipoAdaptacionOptions, aplicaAOptions)),
    asignaturaId: row.fk_tasignatura ?? undefined,
    grupoId: row.fk_tgrupo ?? undefined,
    // `row.estudiantes` (V452, confirmado real) trae de vuelta CUÁLES
    // matrículas quedaron asignadas — antes se asumía que no había forma de
    // leer esto y el form arrancaba siempre en "Todo el grupo" al editar,
    // aunque la actividad tuviera una selección puntual guardada (se veía
    // como si se hubiera perdido, aunque `update-actividad.ts` nunca la
    // tocaba sin que el docente la volviera a elegir). No hay una bandera
    // real de "todo el grupo" en la respuesta —`asignarTodoElGrupo` queda
    // en `false` y la lista explícita, que es funcionalmente idéntica
    // (misma gente asignada) aunque el grupo crezca después no se auto-
    // incluye a los nuevos hasta que el docente vuelva a tocar "Estudiantes".
    matriculasIds: (row.estudiantes ?? []).map((e) => e.pkTmatricula),
    asignarTodoElGrupo: false,
    camposDisponibles: toCamposDisponibles(row.campos_disponibles),
  }
}

function actividadDetalleUrl(id: number): string {
  return `/planeador/actividades/${id}`
}

export const actividadDetalleQueryKey = (id: number) => ["planeador", "actividad", id] as const

/**
 * Detalle de una actividad. El sobre `{rows: [...]}` es igual en mock y
 * real; lo que cambia es la forma de la fila — el mock ya entrega
 * `Actividad` completa (`normalizeActividad` solo defiende `recursos`
 * ausente), el real entrega `ActividadDetalleRow` y hay que traducirla con
 * `toActividadDetalle`. Si no existe, se lanza un error para que el
 * `<ErrorBoundary>` / toast del interceptor se encargue.
 */
async function fetchActividadDetalle(id: number): Promise<Actividad> {
  const rows = await evalCol.getRows<Actividad | ActividadDetalleRow>(actividadDetalleUrl(id))
  const first = rows[0]
  if (!first) {
    throw new Error(`No se encontró la actividad ${id}.`)
  }
  if (env.ENABLE_API_MOCKING) {
    const mock = first as Actividad
    return {
      ...mock,
      recursos: mock.recursos ?? [],
      // El mock no modela el referente curricular, que es lo que decide
      // `es_formativa` en el real: se aproxima con lo que sí tiene, para que
      // el camino de observación siga siendo alcanzable sin backend.
      esFormativa: Boolean(mock.unidad?.id) && !mock.esEvaluativa,
    }
  }
  const [tipoRecursoOptions, tipoAdaptacionOptions, aplicaAOptions, nombresArchivo] = await Promise.all([
    fetchTipoRecursoOptions(),
    fetchTipoAdaptacionOptions(),
    fetchAplicaAOptions(),
    fetchMaterialArchivos(id),
  ])
  const actividad = toActividadDetalle(
    first as ActividadDetalleRow,
    tipoRecursoOptions,
    tipoAdaptacionOptions,
    aplicaAOptions,
  )
  // El nombre del archivo llena `fuente` y `titulo`, que es de donde la lista
  // saca la etiqueta y la vista previa la extensión. Sin esto, un material
  // guardado se ve como una fila en blanco.
  return {
    ...actividad,
    recursos: actividad.recursos.map((recurso) => {
      if (recurso.archivoId === undefined) return recurso
      const nombre = nombresArchivo.get(recurso.archivoId)
      if (!nombre) return recurso
      return { ...recurso, fuente: recurso.fuente || nombre, titulo: recurso.titulo || nombre }
    }),
  }
}

export function useActividadDetalleQuery(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? actividadDetalleQueryKey(id) : ["planeador", "actividad", "none"],
    queryFn: () => fetchActividadDetalle(id!),
    enabled: id !== undefined,
    staleTime: 1000 * 60,
  })
}
