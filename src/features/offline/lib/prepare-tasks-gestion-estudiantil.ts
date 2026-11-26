/**
 * Gestión Estudiantil en "Preparar": cada listado con los filtros por defecto
 * de su pantalla (misma key), sus páginas siguientes, sus catálogos y el
 * detalle de cada fila. Cada bloque va detrás de su ruta de menú.
 *
 * NO se siembran los detalles cuyo GET ESCRIBE en el backend: dejan traza de
 * consulta del expediente (Sección 14 / Regla 21, `fn_expediente_consulta_registrar_interno`)
 * o cambian su estado (un reporte de consumo pasa a Recibido). Bajarlos en
 * segundo plano registraría consultas que nadie hizo. Son: PIAR y su historial
 * (para quien ve lo sensible), remisiones y atenciones de orientación, señal
 * de salud mental, acompañamiento, reporte de consumo, caracterización,
 * historial académico y remisión externa.
 */
import type { QueryClient, QueryKey } from "@tanstack/react-query"

import type { PrepareTask } from "@/features/offline/lib/prepare-engine"
import { menuIncludes, seed, type SeedOptions } from "@/features/offline/lib/prepare-seed"
import { catalogoMeta, offlineMeta, TTL_OFFLINE } from "@/lib/offline/query-meta"
import { selectCategoryQueryOptions } from "@/features/establishment/academic-period/api/query/fetch-select-category"
// Comunes
import { capacidadesGeKeys, fetchCapacidadesGe } from "@/features/gestion-estudiantil/commons/api/use-capacidades-ge"
import { fetchOpcionesGrupos } from "@/features/gestion-estudiantil/commons/api/use-opciones-grupos"
import {
  fetchAniosGe,
  fetchJornadasGe,
  fetchPeriodosGe,
  fetchSedesGe,
  opcionesGeKeys,
} from "@/features/gestion-estudiantil/commons/api/use-opciones-ge"
// Observador
import { observadorKeys } from "@/features/gestion-estudiantil/observador/api/query-keys"
import {
  fetchAnotacion,
  fetchAnotaciones,
  toObservadorFilters,
} from "@/features/gestion-estudiantil/observador/api/query/use-anotaciones-query"
import { fetchCodigosAnotacion } from "@/features/gestion-estudiantil/observador/api/query/use-codigos-anotacion-query"
import {
  fetchResponsablesObservador,
  toQueryString,
} from "@/features/gestion-estudiantil/observador/api/query/use-opciones-observador-query"
import { FILTROS_VACIOS as OBSERVADOR_VACIOS } from "@/features/gestion-estudiantil/observador/api/types"
// Convivencia
import { comiteKeys, convivenciaKeys, procesosKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"
import {
  fetchCaso,
  fetchCasos,
  fetchPasosCaso,
  toConvivenciaFilters,
} from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import {
  fetchComite,
  fetchPeriodosComite,
  fetchSesionComite,
  fetchSesionesComite,
} from "@/features/gestion-estudiantil/convivencia/api/query/use-comite-query"
import { fetchProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/query/use-proceso-detalle-query"
import {
  fetchProcesos,
  fetchResponsablesFiltro,
  toProcesosFilters,
} from "@/features/gestion-estudiantil/convivencia/api/query/use-procesos-query"
import { PROCESOS_FILTROS_VACIOS } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { FILTROS_VACIOS as CONVIVENCIA_VACIOS } from "@/features/gestion-estudiantil/convivencia/api/types"
// Citaciones y compromisos
import { citacionesKeys } from "@/features/gestion-estudiantil/citaciones/api/query-keys"
import {
  fetchCitacion,
  fetchCitaciones,
  toCitacionesFilters,
} from "@/features/gestion-estudiantil/citaciones/api/query/use-citaciones-query"
import {
  fetchCompromiso,
  fetchCompromisos,
  toCompromisosFilters,
} from "@/features/gestion-estudiantil/citaciones/api/query/use-compromisos-query"
import { CITACIONES_FILTROS_VACIOS, COMPROMISOS_FILTROS_VACIOS } from "@/features/gestion-estudiantil/citaciones/api/types"
// Inclusión y orientación
import { fetchInformeInclusion } from "@/features/gestion-estudiantil/inclusion/informe/api/use-informe-query"
import { orientacionKeys } from "@/features/gestion-estudiantil/inclusion/orientacion/api/query-keys"
import {
  fetchAtenciones,
  fetchMisRemisiones,
  fetchRemisiones,
} from "@/features/gestion-estudiantil/inclusion/orientacion/api/query/use-orientacion-query"
import { FILTROS_VACIOS as ORIENTACION_VACIOS } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"
import { fetchAccesoInclusion } from "@/features/gestion-estudiantil/inclusion/piar/api/use-piar-access"
import { piarKeys } from "@/features/gestion-estudiantil/inclusion/piar/api/query-keys"
import { fetchGradosFiltroPiar, fetchPiarLista, fetchSinPiar, piarQueryOptions } from "@/features/gestion-estudiantil/inclusion/piar/api/query/use-piar-query"
import { FILTROS_VACIOS as PIAR_VACIOS } from "@/features/gestion-estudiantil/inclusion/piar/api/types"
// Reconocimientos
import { reconocimientosKeys } from "@/features/gestion-estudiantil/reconocimientos/api/query-keys"
import {
  fetchReconocimiento,
  fetchReconocimientos,
  toReconocimientosFilters,
} from "@/features/gestion-estudiantil/reconocimientos/api/query/use-reconocimientos-query"
import { fetchSugerencias } from "@/features/gestion-estudiantil/reconocimientos/api/query/use-sugerencias-query"
import { RECONOCIMIENTOS_FILTROS_VACIOS } from "@/features/gestion-estudiantil/reconocimientos/api/types"
import { ROLES_SUPERVISAN_RECONOCIMIENTO } from "@/features/gestion-estudiantil/reconocimientos/api/ui-mappings"
// Observaciones y sugerencias
import { observacionesKeys } from "@/features/gestion-estudiantil/observaciones/api/query-keys"
import {
  fetchObservacion,
  fetchObservaciones,
  toObservacionesFilters,
} from "@/features/gestion-estudiantil/observaciones/api/query/use-observaciones-query"
import { OBSERVACIONES_FILTROS_VACIOS } from "@/features/gestion-estudiantil/observaciones/api/types"
// Actividades extracurriculares
import { actividadesKeys } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query-keys"
import {
  fetchActividad,
  fetchActividades,
  fetchParticipantes,
  fetchSesionActividad,
  fetchSesionesActividad,
  toActividadesFilters,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-actividades-query"
import {
  fetchParametrosServicioSocial,
  fetchServicioSocial,
  fetchServicioSocialEstudiante,
  toServicioSocialFilters,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-servicio-social-query"
import {
  ACTIVIDADES_FILTROS_VACIOS,
  SERVICIO_SOCIAL_FILTROS_VACIOS,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
// Reintegración
import { reintegracionKeys } from "@/features/gestion-estudiantil/reintegracion/api/query-keys"
import {
  fetchCasoReintegracion,
  fetchCasosReintegracion,
  toCasosFilters,
} from "@/features/gestion-estudiantil/reintegracion/api/query/use-casos-query"
import { fetchIntervenciones } from "@/features/gestion-estudiantil/reintegracion/api/query/use-intervenciones-query"
import { fetchOpcionesLista } from "@/features/gestion-estudiantil/reintegracion/api/query/use-opciones-query"
import { fetchPermisosReintegracion } from "@/features/gestion-estudiantil/reintegracion/api/query/use-permisos-query"
import { fetchPlazoRemisiones, fetchRemisionesCaso } from "@/features/gestion-estudiantil/reintegracion/api/query/use-remisiones-query"
import { CASOS_FILTROS_VACIOS } from "@/features/gestion-estudiantil/reintegracion/api/types"
// Prevención y retención
import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import {
  fetchAcompanamientos,
  fetchReportesConsumo,
  toAcompanamientosFilters,
  toReportesConsumoFilters,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-acompanamientos-query"
import {
  fetchCaracterizaciones,
  fetchCaracterizacionFiltros,
  toCaracterizacionesFilters,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-caracterizacion-query"
import {
  fetchEstrategia,
  fetchEstrategias,
  toEstrategiasFilters,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-estrategias-query"
import {
  fetchGestionAlerta,
  fetchGestionAlertas,
  fetchGestionAlertasContador,
  fetchOpcionesGestionAlertas,
  toGestionAlertasFilters,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-gestion-alertas-query"
import {
  fetchOpcionesGruposPrevencion,
  fetchOpcionesMotivosRetiro,
  fetchOpcionesPeriodos,
  fetchOpcionesPeriodosAcademicos,
  fetchOpcionesResponsables,
  fetchOpcionesEstadosAcomp,
  fetchOpcionesSedesJornadas,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-opciones-prevencion-query"
import {
  fetchAccesoPrevencion,
  fetchIndicadores,
  fetchIndicadoresGestion,
  fetchParametrosRiesgo,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-parametros-indicadores-query"
import { fetchSaludMental, toSaludMentalFilters } from "@/features/gestion-estudiantil/prevencion/api/query/use-salud-mental-query"
import { fetchTablero, historialQueryOptions, toTableroFilters } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import {
  fetchPlan,
  fetchValoracion,
  fetchValoraciones,
  toValoracionesFilters,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-valoraciones-query"
import {
  ACOMPANAMIENTOS_FILTROS_VACIOS,
  CARACTERIZACIONES_FILTROS_VACIOS,
  ESTRATEGIAS_FILTROS_VACIOS,
  GESTION_ALERTAS_FILTROS_VACIOS,
  INDICADORES_FILTROS_VACIOS,
  REPORTES_CONSUMO_FILTROS_VACIOS,
  SALUD_MENTAL_FILTROS_VACIOS,
  TABLERO_FILTROS_VACIOS,
  VALORACIONES_FILTROS_VACIOS,
  type AccesoPrevencion,
} from "@/features/gestion-estudiantil/prevencion/api/types"
import { toIndicadoresFilters } from "@/features/gestion-estudiantil/prevencion/utils/indicadores"
// Configuración y catálogo de anotaciones
import { codigosQueryOptions } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/query/use-codigos-query"
import { FILTROS_VACIOS as CATALOGO_VACIOS } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/types"
import { configuracionKeys } from "@/features/gestion-estudiantil/configuracion/api/query-keys"
import {
  fetchAccesoConfiguracion,
  fetchNivelesConvivencia,
} from "@/features/gestion-estudiantil/configuracion/api/query/use-configuracion-query"
import {
  fetchClasificaciones,
  fetchEfectosSancion,
  fetchPlazosDisciplinario,
  sancionesQueryOptions,
} from "@/features/gestion-estudiantil/configuracion/api/query/use-proceso-query"
import {
  fetchCausasReservadas,
  fetchServicioSocialConfig,
} from "@/features/gestion-estudiantil/configuracion/api/query/use-riesgo-servicio-query"
import { SANCION_FILTROS_VACIOS } from "@/features/gestion-estudiantil/configuracion/api/types"

/** `TablePaginationProvider` y los listados con paginación local abren en 10 filas. */
const PAGE_SIZE = 10
/** Beneficiarios en el detalle de la estrategia (`estrategia-detalle-page.tsx`). */
const BENEFICIARIOS_PAGE_SIZE = 20
/** Todas las páginas de cada listado, con un tope de seguridad (2000 filas). */
export const MAX_PAGINAS_GE = 200

const ROOT = "/app/gestion-estudiantil"
const meta = () => offlineMeta(TTL_OFFLINE.grupo)

type Sede = Awaited<ReturnType<typeof fetchSedesGe>>[number]

/** Dato accesorio o detalle: si falla no marca la preparación. */
function extra<T>(queryKey: QueryKey, queryFn: () => Promise<T>, then?: SeedOptions<T>["then"]): PrepareTask {
  return seed(queryKey, queryFn, meta(), { optional: true, then })
}

function catalogos(...categorias: string[]): PrepareTask[] {
  return categorias.map((categoria) => {
    const { queryKey, queryFn } = selectCategoryQueryOptions(categoria)
    return seed(queryKey, queryFn, catalogoMeta(), { optional: true })
  })
}

interface Pagina<R> {
  rows: R[]
  pageCount: number
}

interface ListadoOptions<R> {
  /** Detalle de cada fila. */
  fila?: (row: R) => PrepareTask[]
  /** Listado secundario (pestaña que depende del rol): su fallo no cuenta. */
  optional?: boolean
}

/** Página 0 (la que abre la pantalla) y, desde ella, las siguientes hasta el tope. */
function listado<R>(
  opciones: (pageIndex: number) => { queryKey: QueryKey; queryFn: () => Promise<Pagina<R>> },
  { fila, optional }: ListadoOptions<R> = {},
  pageIndex = 0,
): PrepareTask {
  const { queryKey, queryFn } = opciones(pageIndex)
  return seed(queryKey, queryFn, meta(), {
    optional: optional || pageIndex > 0,
    then: (result) => [
      ...(pageIndex === 0
        ? Array.from({ length: Math.max(0, Math.min(result.pageCount, MAX_PAGINAS_GE) - 1) }, (_, i) =>
            listado(opciones, { fila, optional }, i + 1),
          )
        : []),
      ...(fila ? result.rows.flatMap(fila) : []),
    ],
  })
}

/** El listado con la forma común `{ filters, pageIndex, pageSize }` en la key. */
function listadoFiltrado<F, R>(
  key: (params: { filters: F; pageIndex: number; pageSize: number }) => QueryKey,
  fetchFn: (params: { filters: F; pageIndex: number; pageSize: number }) => Promise<Pagina<R>>,
  filters: F,
  options?: ListadoOptions<R>,
): PrepareTask {
  return listado((pageIndex) => {
    const params = { filters, pageIndex, pageSize: PAGE_SIZE }
    return { queryKey: key(params), queryFn: () => fetchFn(params) }
  }, options)
}

/** Lo que sale de las sedes GE del usuario (establecimiento, capacidades…). */
function conSedes(tareas: (sedes: Sede[]) => PrepareTask[]): PrepareTask {
  return seed(opcionesGeKeys.sedes(), fetchSedesGe, meta(), { then: (sedes) => (sedes.length > 0 ? tareas(sedes) : []) })
}

/** El establecimiento de `useOpcionesCascada("")`: solo si hay uno en el alcance. */
function establecimientoUnico(sedes: Sede[]): number | null {
  const ids = new Set(sedes.map((s) => s.establecimientoId))
  return ids.size === 1 ? [...ids][0] : null
}

function capacidades(establecimiento: number, then?: SeedOptions<Awaited<ReturnType<typeof fetchCapacidadesGe>>>["then"]) {
  return extra(capacidadesGeKeys.establecimiento(establecimiento), () => fetchCapacidadesGe(establecimiento), then)
}

// ---- Observador -----------------------------------------------------------------

function observadorTasks(): PrepareTask[] {
  return [
    listadoFiltrado(observadorKeys.lista, fetchAnotaciones, toObservadorFilters("", OBSERVADOR_VACIOS), {
      fila: (a) => [extra(observadorKeys.detalle(a.id), () => fetchAnotacion(a.id))],
    }),
    // «Imprimir observador» elige qué firmar.
    ...catalogos("ESTADO_REMISION_ORIENTACION", "TIPO_OBSERVADOR_FIRMAR"),
    conSedes((sedes) => {
      const unico = establecimientoUnico(sedes)
      const qs = toQueryString({ SEARCH: undefined, ESTABLECIMIENTO: unico, SEDE: undefined })
      return [
        extra(observadorKeys.opciones("responsables", qs), () => fetchResponsablesObservador(qs)),
        // Con varios colegios los códigos esperan a que se elija uno: se guardan los de todos.
        ...[...new Set(sedes.map((s) => s.establecimientoId))].map((ee) =>
          extra(observadorKeys.codigos(ee), () => fetchCodigosAnotacion(ee)),
        ),
        capacidades(sedes[0].establecimientoId, (cap) => {
          if (!cap?.observador_puede_ver_mis_reportes) return []
          return [
            listado(
              (pageIndex) => {
                const params = { estado: "", pageIndex, pageSize: PAGE_SIZE }
                return { queryKey: orientacionKeys.lista("mis-remisiones", params), queryFn: () => fetchMisRemisiones(params) }
              },
              { optional: true },
            ),
          ]
        }),
      ]
    }),
  ]
}

// ---- Convivencia ----------------------------------------------------------------

function comiteTasks(): PrepareTask[] {
  return [
    ...catalogos("TIPO_SESION_COMITE", "CARGO_COMITE_CONVIVENCIA"),
    extra(comiteKeys.periodos(), fetchPeriodosComite, (periodos) =>
      periodos.map(({ fk_periodo }) =>
        extra(comiteKeys.detalle(fk_periodo), () => fetchComite(fk_periodo), ({ fk_comite: comite }) =>
          comite == null
            ? []
            : [
                listado(
                  (pageIndex) => {
                    const params = { comite, filters: { FK_TLV_TIPO: null }, pageIndex, pageSize: PAGE_SIZE }
                    return { queryKey: comiteKeys.sesiones(params), queryFn: () => fetchSesionesComite(params) }
                  },
                  { optional: true, fila: (s) => [extra(comiteKeys.sesion(s.id), () => fetchSesionComite(s.id))] },
                ),
              ],
        ),
      ),
    ),
  ]
}

function convivenciaTasks(): PrepareTask[] {
  return [
    listadoFiltrado(convivenciaKeys.lista, fetchCasos, toConvivenciaFilters("", CONVIVENCIA_VACIOS), {
      fila: (c) => [
        extra(convivenciaKeys.detalle(c.id), () => fetchCaso(c.id)),
        extra(convivenciaKeys.pasos(c.id), () => fetchPasosCaso(c.id)),
      ],
    }),
    listadoFiltrado(procesosKeys.lista, fetchProcesos, toProcesosFilters("", PROCESOS_FILTROS_VACIOS), {
      fila: (p) => [extra(procesosKeys.detalle(p.id), () => fetchProcesoDetalle(p.id))],
    }),
    extra(procesosKeys.responsables(), fetchResponsablesFiltro),
    extra([...convivenciaKeys.all, "opciones-grupos"], fetchOpcionesGrupos),
    ...catalogos(
      "TIPO_SITUACION",
      "ESTADO_CASO_CONVIVENCIA",
      "ESTADO_PROCESO_DISCIPLINARIO",
      "INSTANCIA_DISCIPLINARIA",
      // Detalle del caso.
      "MANIFESTACION_SITUACION",
      "LUGAR_SITUACION",
      "RESULTADO_SEGUIMIENTO",
      "ENTIDAD_CONCERNIDA_CONVIVENCIA",
      "TIPO_DANO",
      "TIPO_AGRESION",
      "EVENTO_GENERADOR",
    ),
    // El Comité se precarga solo si el backend dice que el usuario lo ve (comite_puede_ver).
    conSedes((sedes) => [capacidades(sedes[0].establecimientoId, (cap) => (cap?.comite_puede_ver ? comiteTasks() : []))]),
  ]
}

// ---- Citaciones y compromisos -----------------------------------------------------

function citacionesTasks(): PrepareTask[] {
  return [
    listadoFiltrado(citacionesKeys.citaciones.lista, fetchCitaciones, toCitacionesFilters("", CITACIONES_FILTROS_VACIOS), {
      fila: (c) => [extra(citacionesKeys.citaciones.detalle(c.id), () => fetchCitacion(c.id))],
    }),
    listadoFiltrado(citacionesKeys.compromisos.lista, fetchCompromisos, toCompromisosFilters("", COMPROMISOS_FILTROS_VACIOS), {
      fila: (c) => [extra(citacionesKeys.compromisos.detalle(c.id), () => fetchCompromiso(c.id))],
    }),
    extra([...citacionesKeys.all, "opciones-grupos"], fetchOpcionesGrupos),
    ...catalogos("ESTADO_CITACION", "MOTIVO_CITACION", "TIPO_COMPROMISO", "ESTADO_COMPROMISO"),
    conSedes((sedes) => [capacidades(sedes[0].establecimientoId)]),
  ]
}

// ---- Inclusión y orientación --------------------------------------------------------

function inclusionTasks(): PrepareTask[] {
  // Las mismas banderas con que la pantalla arma sus pestañas (el rol solo no
  // alcanza: al superadministrador no le descargaba nada).
  return [
    extra(["inclusion", "acceso"], fetchAccesoInclusion, (a) => inclusionSegunAcceso({
      veListado: Boolean(a?.puede_ver_piar),
      veOrientacion: Boolean(a?.puede_ver_orientacion),
      veAvisoSinPiar: Boolean(a?.puede_ver_aviso_sin_piar),
      veInforme: Boolean(a?.puede_ver_informe),
      informeRequiereSede: Boolean(a?.informe_requiere_sede),
    })),
  ]
}

function inclusionSegunAcceso(
  acceso: Record<"veListado" | "veOrientacion" | "veAvisoSinPiar" | "veInforme" | "informeRequiereSede", boolean>,
): PrepareTask[] {
  // Solo quien NO ve lo sensible (el docente) abre el PIAR sin dejar traza de consulta.
  const sinTraza = acceso.veListado && !acceso.veOrientacion
  const tasks: PrepareTask[] = []
  if (acceso.veListado) {
    tasks.push(
      listado(
        (pageIndex) => {
          const params = { search: "", filtros: PIAR_VACIOS, pageIndex, pageSize: PAGE_SIZE }
          return { queryKey: piarKeys.lista(params), queryFn: () => fetchPiarLista(params) }
        },
        {
          fila: (p) => {
            if (!sinTraza) return []
            const { queryKey, queryFn } = piarQueryOptions(p.id)
            return [extra(queryKey, queryFn)]
          },
        },
      ),
      ...catalogos("ESTADO_PIAR"),
      // Filtros de la búsqueda del PIAR (`busqueda-piar.tsx`).
      extra([...piarKeys.all, "opciones-grupos"], fetchOpcionesGrupos),
      extra(piarKeys.gradosFiltro(), fetchGradosFiltroPiar),
    )
  }
  if (acceso.veAvisoSinPiar) tasks.push(extra(piarKeys.aviso("", ""), () => fetchSinPiar("", "")))
  if (acceso.veOrientacion) {
    const params = (pageIndex: number) => ({ search: "", filtros: ORIENTACION_VACIOS, pageIndex, pageSize: PAGE_SIZE })
    tasks.push(
      listado((i) => ({ queryKey: orientacionKeys.lista("remisiones", params(i)), queryFn: () => fetchRemisiones(params(i)) })),
      listado((i) => ({ queryKey: orientacionKeys.lista("atenciones", params(i)), queryFn: () => fetchAtenciones(params(i)) })),
      extra([...orientacionKeys.all, "opciones-grupos"], fetchOpcionesGrupos),
      ...catalogos(
        "MOTIVO_ORIENTACION",
        "ESTADO_REMISION_ORIENTACION",
        "MODALIDAD_ATENCION_ORIENTACION",
        "ORIGEN_ATENCION_ORIENTACION",
      ),
    )
  }
  if (acceso.veInforme) {
    tasks.push(
      conSedes((sedes) => {
        // `TabInforme`: con `informe_requiere_sede` abre en la primera sede, si no en todo el colegio;
        // el año se fija solo en el mayor de los años de esa sede.
        const primera = sedes[0]
        const sede = acceso.informeRequiereSede ? String(primera.id) : ""
        return [
          extra(opcionesGeKeys.anios(primera.id), () => fetchAniosGe(primera.id), (anios) => {
            const anio = anios.length > 0 ? String(Math.max(...anios.map((x) => x.anio))) : ""
            const params = { establecimiento: primera.establecimientoId, sede, anio, grado: "" }
            return [extra(["inclusion", "informe", params], () => fetchInformeInclusion(params))]
          }),
        ]
      }),
    )
  }
  return tasks
}

// ---- Reconocimientos -----------------------------------------------------------------

function reconocimientosTasks(roles: readonly string[]): PrepareTask[] {
  return [
    ...catalogos("TIPO_RECONOCIMIENTO"),
    conSedes((sedes) => {
      const establecimiento = sedes[0].establecimientoId
      const sugerencias = { establecimiento, sede: null, jornada: null }
      return [
        listadoFiltrado(
          reconocimientosKeys.lista,
          fetchReconocimientos,
          toReconocimientosFilters(establecimiento, "", RECONOCIMIENTOS_FILTROS_VACIOS),
          { fila: (r) => [extra(reconocimientosKeys.detalle(r.id), () => fetchReconocimiento(r.id))] },
        ),
        ...(ROLES_SUPERVISAN_RECONOCIMIENTO.some((r) => roles.includes(r))
          ? [extra(reconocimientosKeys.sugerencias(sugerencias), () => fetchSugerencias(sugerencias))]
          : []),
      ]
    }),
  ]
}

// ---- Observaciones y sugerencias --------------------------------------------------------

function observacionesListado(establecimiento: number, filtros: Partial<typeof OBSERVACIONES_FILTROS_VACIOS>): PrepareTask {
  return listadoFiltrado(
    observacionesKeys.lista,
    fetchObservaciones,
    toObservacionesFilters(establecimiento, "", { ...OBSERVACIONES_FILTROS_VACIOS, ...filtros }),
    { fila: (o) => [extra(observacionesKeys.detalle(o.pk), () => fetchObservacion(o.pk))] },
  )
}

/**
 * Filtro inicial de `useObservacionesFiltros`: con una sola sede y una sola
 * jornada se aplican solas, y después el período en curso; en el primer paso
 * con más de una opción se detiene.
 */
function observacionesTasks(): PrepareTask[] {
  return [
    ...catalogos("DESTINATARIOS_OBSERVACION"),
    conSedes((sedes) => {
      const establecimiento = sedes[0].establecimientoId
      const comunes = [capacidades(establecimiento)]
      if (sedes.length > 1) return [...comunes, observacionesListado(establecimiento, {})]
      const sedeId = sedes[0].id
      const sede = String(sedeId)
      return [
        ...comunes,
        seed(opcionesGeKeys.anios(sedeId), () => fetchAniosGe(sedeId), meta(), {
          then: (anios) => {
            const anio = (anios.find((a) => a.esActual) ?? anios[0])?.anio
            if (anio == null) return [observacionesListado(establecimiento, { sede })]
            return [
              seed(opcionesGeKeys.jornadas(sedeId, anio), () => fetchJornadasGe(sedeId, anio), meta(), {
                then: (jornadas) => {
                  const ids = [...new Set(jornadas.map((j) => j.id))]
                  if (ids.length !== 1) return [observacionesListado(establecimiento, { sede })]
                  const params = { sedeId, anio, jornadaId: ids[0] }
                  return [
                    seed(opcionesGeKeys.periodos(params), () => fetchPeriodosGe(params), meta(), {
                      then: (periodos) => {
                        const enCurso = periodos.find((p) => p.enCurso)?.id
                        return [
                          observacionesListado(establecimiento, {
                            sede,
                            jornada: String(ids[0]),
                            periodo: enCurso == null ? "" : String(enCurso),
                          }),
                        ]
                      },
                    }),
                  ]
                },
              }),
            ]
          },
        }),
      ]
    }),
  ]
}

// ---- Actividades extracurriculares ---------------------------------------------------------

function actividadDetalleTasks(id: number): PrepareTask[] {
  return [
    extra(actividadesKeys.detalle(id), () => fetchActividad(id), (actividad) => [
      listado(
        (pageIndex) => {
          const params = { search: "", estado: undefined, pageIndex, pageSize: PAGE_SIZE }
          return { queryKey: actividadesKeys.participantes(id, params), queryFn: () => fetchParticipantes(id, params) }
        },
        { optional: true },
      ),
      ...(actividad.registra_asistencia
        ? [
            listado(
              (pageIndex) => {
                const params = { pageIndex, pageSize: PAGE_SIZE }
                return { queryKey: actividadesKeys.sesiones(id, params), queryFn: () => fetchSesionesActividad(id, params) }
              },
              { optional: true, fila: (s) => [extra(actividadesKeys.sesion(s.id), () => fetchSesionActividad(s.id))] },
            ),
          ]
        : []),
    ]),
  ]
}

function actividadesTasks(): PrepareTask[] {
  return [
    listadoFiltrado(actividadesKeys.lista, fetchActividades, toActividadesFilters("", ACTIVIDADES_FILTROS_VACIOS), {
      fila: (a) => actividadDetalleTasks(a.id),
    }),
    listadoFiltrado(actividadesKeys.servicioSocial.lista, fetchServicioSocial, toServicioSocialFilters("", SERVICIO_SOCIAL_FILTROS_VACIOS), {
      fila: (e) => [extra(actividadesKeys.servicioSocial.estudiante(e.id), () => fetchServicioSocialEstudiante(e.id))],
    }),
    extra(actividadesKeys.servicioSocial.parametros, fetchParametrosServicioSocial),
    ...catalogos("TIPO_ACTIVIDAD_EXTRA", "ESTADO_PARTICIPACION_EXTRA"),
    conSedes((sedes) => [capacidades(sedes[0].establecimientoId)]),
  ]
}

// ---- Reintegración ---------------------------------------------------------------------------

function reintegracionTasks(): PrepareTask[] {
  return [
    extra(reintegracionKeys.opciones.lista("ORIGEN"), () => fetchOpcionesLista("ORIGEN")),
    conSedes((sedes) => {
      const establecimiento = establecimientoUnico(sedes)
      // Con varios colegios la bandeja espera a que se elija una sede.
      if (establecimiento == null) return []
      return [
        extra(reintegracionKeys.permisos(establecimiento), () => fetchPermisosReintegracion(establecimiento)),
        listadoFiltrado(reintegracionKeys.casos, fetchCasosReintegracion, toCasosFilters(establecimiento, "", CASOS_FILTROS_VACIOS), {
          fila: (c) => [
            // Comprobado en el backend (V676): este GET es STABLE, no registra la consulta.
            extra(reintegracionKeys.caso(c.id), () => fetchCasoReintegracion(c.id)),
            extra(reintegracionKeys.intervenciones(c.id), () => fetchIntervenciones(c.id)),
            extra(reintegracionKeys.remisiones(c.id), () => fetchRemisionesCaso(c.id)),
          ],
        }),
      ]
    }),
  ]
}

// ---- Prevención y retención --------------------------------------------------------------------

function prevencionPorAcceso(ee: number, acceso: AccesoPrevencion | null): PrepareTask[] {
  const tasks: PrepareTask[] = []
  const secundario = { optional: true }
  if (acceso?.ver_gestion_alertas) {
    tasks.push(
      extra(prevencionKeys.gestionAlertasContador, fetchGestionAlertasContador),
      extra(prevencionKeys.opciones.gestionAlertas(ee), () => fetchOpcionesGestionAlertas(ee)),
      listadoFiltrado(
        prevencionKeys.gestionAlertas,
        fetchGestionAlertas,
        toGestionAlertasFilters(ee, acceso.gestion_alertas_ver_todas_defecto === true, "", GESTION_ALERTAS_FILTROS_VACIOS),
        { optional: true, fila: (g) => [extra(prevencionKeys.gestionAlerta(g.id), () => fetchGestionAlerta(g.id))] },
      ),
    )
  }
  if (acceso?.puede_salud_mental) {
    tasks.push(
      ...catalogos("SEVERIDAD_SENAL"),
      listadoFiltrado(prevencionKeys.saludMental, fetchSaludMental, toSaludMentalFilters(ee, "", SALUD_MENTAL_FILTROS_VACIOS), secundario),
    )
  }
  if (acceso?.ver_embarazo || acceso?.ver_consumo) {
    const responsables = { establecimiento: ee }
    tasks.push(
      extra(prevencionKeys.opciones.responsables(responsables), () => fetchOpcionesResponsables(responsables)),
      // Filtro de estado de Embarazo, Consumo y Reportes recibidos.
      extra(prevencionKeys.opciones.acompEstados(ee), () => fetchOpcionesEstadosAcomp(ee)),
    )
  }
  for (const tipo of ["EMBARAZO", "CONSUMO"] as const) {
    if (!(tipo === "EMBARAZO" ? acceso?.ver_embarazo : acceso?.ver_consumo)) continue
    tasks.push(
      listadoFiltrado(
        prevencionKeys.acompanamientos,
        fetchAcompanamientos,
        toAcompanamientosFilters(ee, tipo, "", ACOMPANAMIENTOS_FILTROS_VACIOS),
        secundario,
      ),
    )
  }
  if (acceso?.ver_consumo && acceso.ver_reportes_consumo) {
    tasks.push(
      listadoFiltrado(
        prevencionKeys.reportesConsumo,
        fetchReportesConsumo,
        toReportesConsumoFilters(ee, "", REPORTES_CONSUMO_FILTROS_VACIOS),
        secundario,
      ),
    )
  }
  if (acceso?.puede_estrategias) {
    const pagina = { pageIndex: 0, pageSize: BENEFICIARIOS_PAGE_SIZE }
    tasks.push(
      ...catalogos("TIPO_ESTRATEGIA_PERMANENCIA"),
      listadoFiltrado(
        prevencionKeys.estrategias,
        fetchEstrategias,
        toEstrategiasFilters(ee, "", ESTRATEGIAS_FILTROS_VACIOS, undefined),
        { optional: true, fila: (e) => [extra(prevencionKeys.estrategia(e.id, pagina), () => fetchEstrategia(e.id, pagina))] },
      ),
    )
  }
  if (acceso?.puede_caracterizacion) {
    tasks.push(
      extra(prevencionKeys.opciones.caracterizacionFiltros(ee), () => fetchCaracterizacionFiltros(ee)),
      listadoFiltrado(
        prevencionKeys.caracterizaciones,
        fetchCaracterizaciones,
        toCaracterizacionesFilters(ee, "", CARACTERIZACIONES_FILTROS_VACIOS),
        secundario,
      ),
    )
  }
  if (acceso?.puede_indicadores) {
    const filtros = toIndicadoresFilters(ee, INDICADORES_FILTROS_VACIOS)
    const periodos = { establecimiento: ee, periodoAcademico: null }
    tasks.push(
      extra(prevencionKeys.indicadores(filtros), () => fetchIndicadores(filtros)),
      extra(prevencionKeys.opciones.periodosAcademicos(ee), () => fetchOpcionesPeriodosAcademicos(ee)),
      extra(prevencionKeys.opciones.periodos(periodos), () => fetchOpcionesPeriodos(periodos)),
      extra(prevencionKeys.opciones.motivosRetiro, fetchOpcionesMotivosRetiro),
    )
    if (acceso.puede_indicadores_gestion) {
      const gestion = { establecimiento: ee }
      tasks.push(extra(prevencionKeys.indicadoresGestion(gestion), () => fetchIndicadoresGestion(gestion)))
    }
  }
  return tasks
}

function prevencionTasks(): PrepareTask[] {
  return [
    ...catalogos("NIVEL_RIESGO"),
    seed(prevencionKeys.opciones.sedesJornadas("todos"), () => fetchOpcionesSedesJornadas(null), meta(), {
      then: (filas) => {
        // `useAmbitoPrevencion("")`: con varios colegios las pestañas esperan a que se elija una sede.
        const ids = [...new Set(filas.map((f) => f.fk_testablecimiento))]
        if (ids.length !== 1) return [extra(prevencionKeys.acceso("none"), () => fetchAccesoPrevencion(null))]
        const ee = ids[0]
        const grupos = { establecimiento: ee }
        const gruposFiltro = { establecimiento: ee, sede: null, jornada: null }
        return [
          seed(prevencionKeys.acceso(ee), () => fetchAccesoPrevencion(ee), meta(), {
            then: (acceso) => prevencionPorAcceso(ee, acceso),
          }),
          listadoFiltrado(prevencionKeys.tablero, fetchTablero, toTableroFilters(ee, "", TABLERO_FILTROS_VACIOS), {
            fila: (t) => {
              const { queryKey, queryFn } = historialQueryOptions(t.fk_tmatricula)
              return [extra(queryKey, queryFn)]
            },
          }),
          // El tablero pide los grupos dos veces: para las columnas y para el panel de filtros.
          extra(prevencionKeys.opciones.grupos(grupos), () => fetchOpcionesGruposPrevencion(grupos)),
          extra(prevencionKeys.opciones.grupos(gruposFiltro), () => fetchOpcionesGruposPrevencion(gruposFiltro)),
          extra(prevencionKeys.opciones.periodos(grupos), () => fetchOpcionesPeriodos(grupos)),
          listadoFiltrado(prevencionKeys.valoraciones, fetchValoraciones, toValoracionesFilters(ee, "", VALORACIONES_FILTROS_VACIOS), {
            // «Ver» abre el plan si la fila tiene uno; si no, la valoración.
            fila: (v) => {
              const planId = v.fk_tprevencion_plan
              if (planId == null) return [extra(prevencionKeys.valoracion(v.id), () => fetchValoracion(v.id))]
              return [
                extra(prevencionKeys.plan(planId), () => fetchPlan(planId), (plan) => {
                  // El detalle del plan muestra el análisis de la valoración que lo originó.
                  const origen = plan.valoracion ? plan.fk_tprevencion_valoracion : null
                  return origen == null ? [] : [extra(prevencionKeys.valoracion(origen), () => fetchValoracion(origen))]
                }),
              ]
            },
          }),
        ]
      },
    }),
  ]
}

// ---- Configuración (incluye el catálogo de anotaciones) -------------------------------------------

function configuracionTasks(): PrepareTask[] {
  return [
    ...catalogos(
      "TIPO_COMPORTAMIENTO",
      "TIPO_SITUACION",
      "INSTANCIA_DISCIPLINARIA",
      "AVISO_ACUDIENTE_SM_SEGUIMIENTO",
      "CAUSA_INASISTENCIA",
      "GRADOS",
    ),
    conSedes((sedes) => {
      const ee = sedes[0].establecimientoId
      return [
        extra(configuracionKeys.acceso(ee), () => fetchAccesoConfiguracion(ee)),
        extra(configuracionKeys.niveles(ee), () => fetchNivelesConvivencia(ee)),
        listado((pageIndex) =>
          codigosQueryOptions({ establecimiento: ee, search: "", filtros: CATALOGO_VACIOS, pageIndex, pageSize: PAGE_SIZE }),
        ),
        extra(configuracionKeys.plazos(ee), () => fetchPlazosDisciplinario(ee)),
        extra(configuracionKeys.clasificaciones(ee), () => fetchClasificaciones(ee)),
        extra(configuracionKeys.efectos(ee), () => fetchEfectosSancion(ee)),
        listado((pageIndex) => sancionesQueryOptions(ee, "", SANCION_FILTROS_VACIOS, pageIndex, PAGE_SIZE), { optional: true }),
        extra(reintegracionKeys.plazo(ee), () => fetchPlazoRemisiones(ee)),
        extra(prevencionKeys.parametros(ee), () => fetchParametrosRiesgo(ee)),
        extra(configuracionKeys.causasReservadas(ee), () => fetchCausasReservadas(ee)),
        extra(configuracionKeys.servicioSocial(ee), () => fetchServicioSocialConfig(ee)),
      ]
    }),
  ]
}

// ---- Todo junto ------------------------------------------------------------------------------------

/** Qué siembra cada ruta del menú de Gestión Estudiantil. */
const MODULOS: readonly [ruta: string, tareas: (roles: readonly string[]) => PrepareTask[]][] = [
  ["observador", observadorTasks],
  ["convivencia", convivenciaTasks],
  ["citaciones-compromisos", citacionesTasks],
  ["inclusion-orientacion", inclusionTasks],
  ["prevencion-retencion", prevencionTasks],
  ["reconocimientos", reconocimientosTasks],
  ["reintegracion", reintegracionTasks],
  ["observaciones-sugerencias", observacionesTasks],
  ["actividades-extracurriculares", actividadesTasks],
  ["configuracion", configuracionTasks],
]

export function gestionEstudiantilTasks(queryClient: QueryClient, roles: readonly string[]): PrepareTask[] {
  return MODULOS.flatMap(([ruta, tareas]) => (menuIncludes(queryClient, `${ROOT}/${ruta}`) ? tareas(roles) : []))
}
