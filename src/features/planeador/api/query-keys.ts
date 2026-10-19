// Única fuente de query keys del Planeador. Factory jerárquica: TanStack invalida por PREFIJO.
// Las variantes `"none"` son keys de queries deshabilitadas (sin id).

const all = ["planeador"] as const

/** Docente + sede + periodo del filtro avanzado. */
export interface PlaneadorAlcanceKey {
  funcionario?: number
  sede?: number
  periodo?: number
}

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
    /** Prefijo de TODOS los listados de actividades. */
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
    /** Fuera de `actividades.all` a propósito: guardar una actividad no lo cambia. */
    tabs: (alcance?: PlaneadorAlcanceKey) =>
      alcance && Object.values(alcance).some((v) => v != null)
        ? ([...all, "actividades-tabs", alcance] as const)
        : ([...all, "actividades-tabs"] as const),
  },

  actividad: {
    all: actividadAll,
    /** Prefijo de calificaciones/instrumento del mismo id. */
    detalle: actividadDetalle,
    /** Sin `fecha` es prefijo de todas las fechas de esa actividad. */
    calificaciones: (id: number | "none", fecha?: string) =>
      fecha
        ? ([...actividadDetalle(id), "calificaciones", fecha] as const)
        : ([...actividadDetalle(id), "calificaciones"] as const),
    instrumento: actividadInstrumento,
    /** Cuelga del detalle: invalidarlo la refresca. */
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
    /** Mismo criterio que `actividades.tabs`. */
    tabs: (alcance?: PlaneadorAlcanceKey) =>
      alcance && Object.values(alcance).some((v) => v != null)
        ? ([...all, "unidades-tabs", alcance] as const)
        : ([...all, "unidades-tabs"] as const),
  },

  unidad: {
    all: unidadAll,
    /** Prefijo de todo lo que cuelga de la unidad. */
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
  docenteGradoAsignatura: (periodoId?: number, funcionario?: number, sede?: number) =>
    [...all, "docente-grado-asignatura", periodoId ?? null, funcionario ?? null, sede ?? null] as const,
  docenteGrupos: (periodoId?: number, funcionario?: number, sede?: number) =>
    [...all, "docente-grupos", periodoId ?? null, funcionario ?? null, sede ?? null] as const,
  /** `null` = sin acotar (el backend acota al alcance del rol). */
  docentes: (sede?: number, periodo?: number) =>
    [...all, "docentes", sede ?? null, periodo ?? null] as const,
  /** Cascada Sede → Año → Jornada del filtro avanzado. */
  filtros: {
    sedes: () => [...all, "filtros", "sedes"] as const,
    periodos: (sede: number | "none") => [...all, "filtros", "periodos", sede] as const,
  },
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
  /** Lo consume Asistencia pero vive bajo `"planeador"`. */
  sedesOpciones: () => [...all, "sedes", "opciones"] as const,

  /** Históricos sin prefijo `"planeador"`; nunca se invalidan. */
  catalogos: {
    agrupacionPlanilla: () => ["agrupacion-planilla-options"] as const,
    instrumentoEvaluacion: () => ["instrumento-evaluacion-catalog"] as const,
    momentoRegistro: () => ["momento-registro"] as const,
    tipoActividad: () => ["tipo-actividad-catalog"] as const,
    /** Los que necesita el mapeo del detalle de actividad. */
    detalle: (catalogo: "tipo-recurso" | "tipo-adaptacion" | "aplica-a") =>
      ["planeador-detalle-catalogo", catalogo] as const,
  },
} as const

/** El id va en el medio: sin prefijo común, se filtra por posición. */
export function esCalificacionesDeActividad(queryKey: readonly unknown[]): boolean {
  return (
    queryKey[0] === all[0] &&
    queryKey[1] === actividadAll[1] &&
    queryKey[3] === "calificaciones"
  )
}
