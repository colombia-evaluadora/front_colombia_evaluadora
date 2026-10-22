import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { recuperacionValorDesdePk } from "@/features/planeador/api/mutations/recuperacion-body"
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
  type AdaptacionArchivo,
  type ListaValorOption,
  type Recurso,
  type RecursoTipo,
} from "@/features/planeador/api/types/actividad"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { catalogoMeta, estudiantesMeta } from "@/lib/offline/query-meta"
import { motivoNoEditableDeFila } from "@/features/planeador/lib/actividad-editable"

// Fila real del detalle: `unidad`/`fk_tunidad` vienen null si la actividad es huérfana.
// No trae el instrumento: vive en `GET .../actividades/:id/instrumento`.
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
  /** Llega directo; el cruce por grupo de `AsignaturaGradoSection` queda de respaldo. */
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
  // Datetime ISO completo, no `yyyy-MM-dd`.
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
  /** sso V452/V511 — Regla 13, ver `Actividad.rotuloEjecucion`. */
  rotulo_ejecucion?: string
  estudiantes_asignados: number
  estudiantes_evaluados: number
  materiales: unknown[]
  adaptaciones: unknown[]
  /** Config de recuperación guardada (no el catálogo de `campos_disponibles`); null si no aplica. */
  recuperacion: RecuperacionGuardadaRow | null
  // pk de la RELACIÓN (no del enunciado/criterio): el que exige el PATCH para quitarlos.
  evidencias: EvidenciaRelacionadaRow[] | null
  criterios: CriterioRelacionadoRow[] | null
  // Matrículas ya asignadas (V452), mismo id que `matriculasIds`.
  estudiantes: EstudianteAsignadoRow[] | null
  campos_disponibles: CamposDisponiblesRow | null
  unidad_configuracion: unknown
  active: boolean
  /** Docente dueño (V553). Opcionales: sin esas columnas solo no se muestra. */
  fk_tfuncionario_docente?: number | null
  docente_nombre?: string | null
  /** Regla 37 (sso V553): `editable` 'S'/'N' y el motivo cuando es 'N'. */
  editable?: "S" | "N" | null
  motivo_no_editable?: string | null
  /** Versión de la fila (`TACTIVIDAD.VERSION`, concurrencia optimista BE-3B). */
  version?: number | null
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

/** Solo hace falta `pkTmatricula`; el resto lo usa la planilla. */
interface EstudianteAsignadoRow {
  pkTactividadEstudiante: number
  pkTmatricula: number
  fkTestudiante: number
  estudiante: string | null
  calificacion: number | null
  calificable: "S" | "N"
  observacion: string | null
}

/** Nombres de campos asumidos (patrón `*Valor`), sin ejemplo real: lectura tolerante. */
interface RecuperacionGuardadaRow {
  pk: number
  /** `pk_lista_valor`, no el código; ver `resolverRecuperacionValores`. */
  destino?: number | string | null
  destinoValor?: string | null
  fkActividadRecuperar: number | null
  tipoAplicacion?: number | string | null
  tipoAplicacionValor?: string | null
  tipoCalculo?: number | string | null
  tipoCalculoValor?: string | null
  valorPonderacion: number | null
}

/** El backend ya decide `visible` con las reglas completas (huérfana, referente formativo…). */
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
  /** El detalle nunca manda `?RECUPERAR=S`: siempre null/ausente. */
  actividadesRecuperables?: ActividadRecuperable[] | null
}

interface CamposDisponiblesRow {
  criterio: CampoDisponibleRow
  /** Viene como objetos, no `string[]`; ver `normalizeInstrumentosPermitidos`. */
  evaluacion: CampoDisponibleRow & {
    instrumentosPermitidos: Parameters<typeof normalizeInstrumentosPermitidos>[0]
  }
  ponderacion: CampoDisponibleRow & { modo: string | null }
  recuperacion?: RecuperacionCampoDisponibleRow
}

function toDateOnly(value: string | null): string {
  return value ? value.slice(0, 10) : ""
}

/** Se compara `fkReferenteEnunciado` (id de la evidencia), no el pk de la relación. */
function evidenciasIdsFromRow(raw: EvidenciaRelacionadaRow[] | null): number[] {
  return (raw ?? []).map((evidencia) => evidencia.fkReferenteEnunciado)
}

function criteriosUnidadIdsFromRow(raw: CriterioRelacionadoRow[] | null): number[] {
  return (raw ?? []).map((criterio) => criterio.fkTcriterioUnidad)
}

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

/** Un material "Archivo" trae `fkTarchivo` en vez de `url` (exactamente uno); el nombre lo pone `fetchMaterialArchivos`. */
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
    // `pk` como key estable; el índice es respaldo para el mock.
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

/** Nombres de archivo de los materiales (el detalle no los trae). Si falla, no rompe la carga. */
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

/** Los históricos migrados vienen sin extensión: se pega la que resolvió el backend para clasificar. */
function nombreConExtension(row: MaterialArchivoRow): string {
  const yaTiene = /\.[A-Za-z0-9]{2,5}$/.test(row.nombre)
  if (yaTiene || !row.extension) return row.nombre
  return `${row.nombre}.${row.extension}`
}

// `estudiantes` son FK_TMATRICULA (mismo id que guarda el PUT); dejarlo en `[]` pisaba la selección.
// La clave es `especificacionTipo`, no `tipoOtro`. "archivo" lee `archivos` (hasta 3); "biblioteca", `fkTarchivo`.
export function adaptacionFromRaw(
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
  // Se empareja por `formatoAdaptacionNombre`: no hay catálogo a mano.
  const usaVersionModificadaRaw = item.usaVersionModificada ?? item.usa_version_modificada
  const formatoNombreRaw = item.formatoAdaptacionNombre ?? item.formato_adaptacion_nombre
  const urlRaw = item.url ?? item.URL
  const fkTarchivoRaw = item.fkTarchivo ?? item.fk_tarchivo
  const formatoLower = typeof formatoNombreRaw === "string" ? formatoNombreRaw.trim().toLowerCase() : ""
  const versionModificada: Adaptacion["versionModificada"] =
    usaVersionModificadaRaw !== "S"
      ? "no"
      : formatoLower === "archivo" || formatoLower === "enlace" || formatoLower === "biblioteca"
        ? formatoLower
        : "no"
  const versionModificadaRef = versionModificada === "enlace" && typeof urlRaw === "string" ? urlRaw : ""
  const especificacionTipoRaw = item.especificacionTipo ?? item.especificacion_tipo
  const nombrePlantillaRaw = item.nombrePlantilla ?? item.nombre_plantilla
  const archivosRaw = item.archivos
  const estudiantesRaw = item.estudiantes ?? item.estudiantesIds
  const archivos: AdaptacionArchivo[] = Array.isArray(archivosRaw)
    ? archivosRaw
        .map((a) => (a ?? {}) as Record<string, unknown>)
        .map((a) => {
          const fk = a.fkTarchivo ?? a.fk_tarchivo
          const nombre = a.nombre ?? a.NOMBRE
          return typeof fk === "number" ? { fkTarchivo: fk, nombre: typeof nombre === "string" ? nombre : "" } : null
        })
        .filter((a): a is { fkTarchivo: number; nombre: string } => a !== null)
    : []
  return {
    tipo,
    especificacionTipo: typeof especificacionTipoRaw === "string" ? especificacionTipoRaw : "",
    descripcion: typeof descripcionRaw === "string" ? descripcionRaw : "",
    versionModificada,
    versionModificadaRef,
    nombrePlantilla: typeof nombrePlantillaRaw === "string" ? nombrePlantillaRaw : "",
    aplicaA,
    estudiantesIds: Array.isArray(estudiantesRaw)
      ? estudiantesRaw.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      : [],
    archivos: versionModificada === "archivo" ? archivos : [],
    // "biblioteca" referencia un solo archivo: se lee del `fkTarchivo` suelto.
    ...(versionModificada === "biblioteca" && typeof fkTarchivoRaw === "number"
      ? { archivoId: fkTarchivoRaw }
      : {}),
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
    version: row.version ?? null,
    nombre: row.titulo,
    descripcion: row.descripcion ?? "",
    tipo: row.tipo_actividad ?? "Otro",
    esRecuperacion: row.es_recuperacion === "S",
    // Los códigos (`ACTIVIDAD`, `REEMPLAZAR`…) los completa
    // `resolverRecuperacionValores`: el detalle trae pk, no `valor`.
    recuperacionDestino: "",
    recuperacionActividadId: row.recuperacion?.fkActividadRecuperar ?? undefined,
    recuperacionTipoAplicacion: "",
    recuperacionTipoCalculo: "",
    recuperacionValorPonderacion: row.recuperacion?.valorPonderacion ?? undefined,
    // `unidad` viene null si es huérfana; `{id: 0, nombre: ""}` es el sentinel de "sin unidad".
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
    rotuloEjecucion: row.rotulo_ejecucion,
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
    // El form compara `instrumento === "Otro"`, no el nombre completo del backend.
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
    // No hay bandera "todo el grupo": se usa la lista explícita (los nuevos del grupo no se auto-incluyen).
    matriculasIds: (row.estudiantes ?? []).map((e) => e.pkTmatricula),
    asignarTodoElGrupo: false,
    camposDisponibles: toCamposDisponibles(row.campos_disponibles),
    // `es_propia` no se mapea a propósito: la solo lectura la decide `usePlaneadorSoloLectura`.
    docenteId: row.fk_tfuncionario_docente ?? undefined,
    docenteNombre: row.docente_nombre?.trim() || undefined,
    motivoNoEditable: motivoNoEditableDeFila(row),
  }
}

function actividadDetalleUrl(id: number): string {
  return `/planeador/actividades/${id}`
}

/** Catálogos `TLISTA_VALOR` fijos, cacheados con `staleTime: Infinity`. */
function fetchCatalogosDetalle(queryClient: QueryClient) {
  return Promise.all([
    queryClient.ensureQueryData({
      meta: catalogoMeta(),
      queryKey: planeadorKeys.catalogos.detalle("tipo-recurso"),
      queryFn: fetchTipoRecursoOptions,
      staleTime: Infinity,
    }),
    queryClient.ensureQueryData({
      meta: catalogoMeta(),
      queryKey: planeadorKeys.catalogos.detalle("tipo-adaptacion"),
      queryFn: fetchTipoAdaptacionOptions,
      staleTime: Infinity,
    }),
    queryClient.ensureQueryData({
      meta: catalogoMeta(),
      queryKey: planeadorKeys.catalogos.detalle("aplica-a"),
      queryFn: fetchAplicaAOptions,
      staleTime: Infinity,
    }),
  ])
}

/** El detalle trae `pk_lista_valor`; el form usa el código `valor`. */
async function resolverRecuperacionValores(
  row: ActividadDetalleRow,
): Promise<Pick<Actividad, "recuperacionDestino" | "recuperacionTipoAplicacion" | "recuperacionTipoCalculo">> {
  const r = row.recuperacion
  if (!r) return { recuperacionDestino: "", recuperacionTipoAplicacion: "", recuperacionTipoCalculo: "" }
  const catalogos = row.campos_disponibles?.recuperacion?.catalogos
  async function catalogo(propio: ListaValorOption[] | undefined, categoria: string) {
    if (propio?.length) return propio
    const filas = await fetchSelectCategory(categoria)
    return filas.map((fila) => ({ pk: fila.pk_lista_valor, valor: fila.valor, nombre: fila.nombre }))
  }
  const [destinos, aplicaciones, calculos] = await Promise.all([
    catalogo(catalogos?.destino, "DESTINO_RECUPERACION"),
    catalogo(catalogos?.tipoAplicacion, "TIPO_APLICACION_RECUPERACION"),
    catalogo(catalogos?.tipoCalculo, "TIPO_CALCULO_RECUPERACION"),
  ])
  const tipoAplicacion = r.tipoAplicacionValor || recuperacionValorDesdePk(aplicaciones, r.tipoAplicacion)
  return {
    recuperacionDestino: r.destinoValor || recuperacionValorDesdePk(destinos, r.destino),
    recuperacionTipoAplicacion: tipoAplicacion,
    // Con REEMPLAZAR el backend guarda PROMEDIADO igual (columna NOT NULL),
    // pero el form lo oculta y no lo manda: se deja vacío.
    recuperacionTipoCalculo:
      tipoAplicacion === "REEMPLAZAR"
        ? ""
        : r.tipoCalculoValor || recuperacionValorDesdePk(calculos, r.tipoCalculo),
  }
}

export async function fetchActividadDetalle(id: number, queryClient: QueryClient): Promise<Actividad> {
  // En paralelo; con mocks no se piden catálogos.
  const catalogosPromise = env.ENABLE_API_MOCKING ? undefined : fetchCatalogosDetalle(queryClient)
  const archivosPromise = env.ENABLE_API_MOCKING ? undefined : fetchMaterialArchivos(id)
  // Si el detalle falla, que el rechazo de los catálogos no quede sin manejar.
  catalogosPromise?.catch(() => undefined)
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
      // El mock no modela el referente curricular: se aproxima `es_formativa`.
      esFormativa: Boolean(mock.unidad?.id) && !mock.esEvaluativa,
    }
  }
  const [[tipoRecursoOptions, tipoAdaptacionOptions, aplicaAOptions], nombresArchivo, recuperacion] = await Promise.all([
    catalogosPromise!,
    archivosPromise!,
    resolverRecuperacionValores(first as ActividadDetalleRow),
  ])
  const actividad = toActividadDetalle(
    first as ActividadDetalleRow,
    tipoRecursoOptions,
    tipoAdaptacionOptions,
    aplicaAOptions,
  )
  Object.assign(actividad, recuperacion)
  // Sin el nombre, un material guardado se ve como fila en blanco.
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

/** Opciones del detalle, compartidas por el hook y el prefetch. */
export function actividadDetalleQueryOptions(id: number, queryClient: QueryClient) {
  return {
    meta: estudiantesMeta(),
    queryKey: planeadorKeys.actividad.detalle(id),
    queryFn: () => fetchActividadDetalle(id, queryClient),
    staleTime: 1000 * 60,
  }
}

/** Precarga el detalle al hover/foco; no hace nada si ya está fresco. */
export function prefetchActividadDetalle(queryClient: QueryClient, id: number) {
  void queryClient.prefetchQuery(actividadDetalleQueryOptions(id, queryClient))
}

export function useActividadDetalleQuery(
  id: number | undefined,
  options: {
    /**
     * Pide el detalle al servidor al montar aunque el de la caché esté
     * fresco. Lo usa la pantalla de edición: el bloqueo de la Regla 37
     * (`motivoNoEditable`) cambia con la primera calificación, que no
     * invalida este detalle si se hizo desde otra pantalla u otro equipo.
     */
    siempreAlMontar?: boolean
  } = {},
) {
  const queryClient = useQueryClient()
  return useQuery({
    meta: estudiantesMeta(),
    queryKey: id !== undefined ? planeadorKeys.actividad.detalle(id) : planeadorKeys.actividad.detalle("none"),
    queryFn: () => fetchActividadDetalle(id!, queryClient),
    enabled: id !== undefined,
    staleTime: 1000 * 60,
    ...(options.siempreAlMontar ? { refetchOnMount: "always" as const } : {}),
  })
}
