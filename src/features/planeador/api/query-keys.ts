/**
 * Única fuente de las query keys del Planeador (lecturas, invalidaciones,
 * `getQueryData`, `useIsFetching`…). Nada en el feature debería escribir un
 * array literal `["planeador", ...]`: se arma desde acá.
 *
 * Por qué una factory jerárquica: TanStack Query invalida por PREFIJO de la
 * key. Antes cada hook declaraba su key suelta y las invalidaciones se
 * escribían a mano, y varias no prefijaban lo que querían refrescar — p. ej.
 * `["planeador","actividades"]` no matcheaba `["planeador","actividades-mias",
 * params]`, así que importar actividades (y antes crear/editar/eliminar) no
 * refrescaba el rail, el calendario ni las cards de resumen. Acá cada nivel se
 * construye extendiendo el anterior (`[...actividadesAll, "mias", params]`),
 * de modo que `planeadorKeys.actividades.all` es por construcción prefijo de
 * todo lo que cuelga de él.
 *
 * Los params de los listados son genéricos a propósito: cada hook pasa su
 * propio objeto de params tipado y la factory no necesita importarlos.
 *
 * Las variantes `"none"` son las keys de queries deshabilitadas (sin id
 * todavía): nunca hacen fetch, solo evitan colisionar con una key real.
 */

const all = ["planeador"] as const

// ---- Actividades (listados) ------------------------------------------------
const actividadesAll = [...all, "actividades"] as const

// ---- Actividad (detalle y lo que cuelga de un id) ---------------------------
const actividadAll = [...all, "actividad"] as const
const actividadDetalle = (id: number | "none") => [...actividadAll, id] as const
const actividadInstrumento = (id: number | "none") => [...actividadDetalle(id), "instrumento"] as const

// ---- Actividad-estudiante (nota/soportes de una fila de la planilla) -------
const actividadEstudianteAll = [...all, "actividad-estudiante"] as const
const actividadEstudiante = (pk: number | "none") => [...actividadEstudianteAll, pk] as const

// ---- Unidades temáticas ----------------------------------------------------
const unidadesAll = [...all, "unidades"] as const
const unidadAll = [...all, "unidad"] as const
const unidadDetalle = (id: number | "none") => [...unidadAll, id] as const

// ---- Planilla ---------------------------------------------------------------
const planillaAll = [...all, "planilla"] as const
const planillaCalificacionesAll = [...planillaAll, "calificaciones"] as const

export const planeadorKeys = {
  all,

  actividades: {
    /** Prefijo de TODOS los listados de actividades (rail, calendario, stats,
     *  listado legado, programación). Es lo que invalida
     *  `invalidarListadosActividades`. */
    all: actividadesAll,
    /** Listado legado `size=500` (lo usa `DialogBibliotecaRecursos`). */
    lista: () => [...actividadesAll, "lista"] as const,
    /** Rail por día (`/actividades/mias`). */
    mias: <P>(params: P) => [...actividadesAll, "mias", params] as const,
    /** Calendario mensual (`/actividades/calendario`). */
    calendario: <P>(params: P) => [...actividadesAll, "calendario", params] as const,
    /** Cards de resumen (`/actividades/stats`). */
    stats: <P>(params: P) => [...actividadesAll, "stats", params] as const,
    programacion: (
      grupoId: number | "none",
      asignaturaId?: number,
      unidadId?: number | null,
    ) => [...actividadesAll, "configuracion", "programacion", grupoId, asignaturaId, unidadId] as const,
    /** Pestañas del rótulo de ejecución: catálogo, fuera de `actividades.all`
     *  a propósito (guardar una actividad no lo cambia). */
    tabs: () => [...all, "actividades-tabs"] as const,
  },

  actividad: {
    all: actividadAll,
    /** Detalle. Es prefijo de calificaciones/instrumento del mismo id, así que
     *  invalidarlo también los refresca. */
    detalle: actividadDetalle,
    /** Sin `fecha` es prefijo de todas las fechas de esa actividad. */
    calificaciones: (id: number | "none", fecha?: string) =>
      fecha
        ? ([...actividadDetalle(id), "calificaciones", fecha] as const)
        : ([...actividadDetalle(id), "calificaciones"] as const),
    instrumento: actividadInstrumento,
    /** Validación de la planeación por el Coordinador (cuelga del detalle:
     *  invalidar el detalle la refresca). */
    validacionCoordinador: (id: number | "none") => [...actividadDetalle(id), "validacion-coordinador"] as const,
    instrumentoForm: (id: number | "none") => [...actividadInstrumento(id), "form"] as const,
    configuracionContexto: (
      grupoId: number | "none",
      asignaturaId: number | undefined,
      esEvaluativa: boolean,
    ) => [...actividadAll, "configuracion-contexto", grupoId, asignaturaId, esEvaluativa] as const,
    recuperables: (grupoId: number | "none", asignaturaId?: number) =>
      [...actividadAll, "actividades-recuperables", grupoId, asignaturaId] as const,
  },

  actividadEstudiante: {
    all: actividadEstudianteAll,
    nota: (pk: number | "none") => [...actividadEstudiante(pk), "nota"] as const,
    soportes: (pk: number | "none") => [...actividadEstudiante(pk), "soportes"] as const,
  },

  unidades: {
    all: unidadesAll,
    lista: <P>(params: P) => [...unidadesAll, params] as const,
    tabs: () => [...all, "unidades-tabs"] as const,
  },

  unidad: {
    all: unidadAll,
    /** Detalle. Es prefijo de todo lo que cuelga de la unidad (actividades,
     *  criterios, valoraciones, referente, configuración…): vincular o
     *  desvincular una actividad invalida este prefijo. */
    detalle: unidadDetalle,
    actividades: (id: number | "none") => [...unidadDetalle(id), "actividades"] as const,
    actividadesDisponibles: (id: number | "none", search: string) =>
      [...unidadDetalle(id), "actividades-disponibles", search] as const,
    criterios: (id: number | "none") => [...unidadDetalle(id), "criterios"] as const,
    valoraciones: (id: number | "none") => [...unidadDetalle(id), "valoraciones"] as const,
    referente: (id: number | "none") => [...unidadDetalle(id), "referente"] as const,
    configuracionActividad: (id: number | "none", esEvaluativa: boolean) =>
      [...unidadDetalle(id), "configuracion-actividad", esEvaluativa] as const,
  },

  planilla: {
    all: planillaAll,
    calificaciones: {
      all: planillaCalificacionesAll,
      lista: <P>(params: P | "none") => [...planillaCalificacionesAll, params] as const,
    },
    columnas: <P>(params: P | "none") => [...planillaAll, "columnas", params] as const,
  },

  matriculasGrupo: (grupoId: number | "none") => [...all, "matriculas-grupo", grupoId] as const,
  docenteGradoAsignatura: (periodoId?: number) =>
    [...all, "docente-grado-asignatura", periodoId ?? null] as const,
  docenteGrupos: (periodoId?: number) => [...all, "docente-grupos", periodoId ?? null] as const,
  gradoGrupos: (gradoId: number | undefined) => [...all, "grado-grupos", gradoId ?? "none"] as const,
  periodosEvaluacion: () => [...all, "periodos-evaluacion"] as const,
  referenteCurricular: (gradoId: number | "none", asignaturaId?: number) =>
    [...all, "referente-curricular", gradoId, asignaturaId ?? null] as const,
  rotuloActividad: (gradoId: number | "none", asignaturaId?: number, anio?: number) =>
    [...all, "rotulo-actividad", gradoId, asignaturaId ?? null, anio ?? null] as const,
  materialesReutilizables: <P>(params: P) => [...all, "materiales-reutilizables", params] as const,
  adaptacionesReutilizables: <P>(params: P) => [...all, "adaptaciones-reutilizables", params] as const,
  dominioMaterial: (categoria: string) => [...all, "dominio-material", categoria] as const,
  tipoAdaptacionCatalog: () => [...all, "tipo-adaptacion-catalog"] as const,
  /** La consume Asistencia (`use-sedes-opciones-query.ts`) pero vive bajo
   *  `"planeador"` desde antes; se declara acá para que no haya dos fuentes. */
  sedesOpciones: () => [...all, "sedes", "opciones"] as const,

  /** Catálogos históricos que nunca llevaron el prefijo `"planeador"`. Se
   *  conservan tal cual (con `staleTime: Infinity` cambiarles el valor no
   *  aporta nada) y nunca se invalidan. */
  catalogos: {
    agrupacionPlanilla: () => ["agrupacion-planilla-options"] as const,
    instrumentoEvaluacion: () => ["instrumento-evaluacion-catalog"] as const,
    momentoRegistro: () => ["momento-registro"] as const,
    tipoActividad: () => ["tipo-actividad-catalog"] as const,
  },
} as const

/**
 * `["planeador","actividad",<id>,"calificaciones",<fecha?>]` de CUALQUIER
 * actividad: el id va en el medio, así que no hay prefijo común y se filtra
 * por posición (lo usa `invalidarPlaneadorPorAsistencia`).
 */
export function esCalificacionesDeActividad(queryKey: readonly unknown[]): boolean {
  return (
    queryKey[0] === all[0] &&
    queryKey[1] === actividadAll[1] &&
    queryKey[3] === "calificaciones"
  )
}
