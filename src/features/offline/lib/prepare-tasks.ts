// Cada tarea usa la MISMA key, queryFn y meta que la pantalla: otra key es otra query y sin red no aparece.
// Lo que depende del rol (puede dar 403) va como opcional.
import type { QueryClient, QueryKey } from "@tanstack/react-query"

import type { PlanillaTarget, PrepareSelection } from "@/components/offline/prepare-offline-plan"
import { buildPlanillaTargets } from "@/components/offline/prepare-offline-plan"
import type { PrepareContext, PrepareTask } from "@/features/offline/lib/prepare-engine"
import { prepareQuery } from "@/features/offline/lib/prepare-query"
import { cacheArchivo } from "@/lib/offline/file-cache"
import {
  TTL_OFFLINE,
  catalogoMeta,
  estudiantesMeta,
  offlineMeta,
  proveedorMeta,
  type AppQueryMeta,
} from "@/lib/offline/query-meta"
import { CATALOGS } from "@/lib/catalogs"
import { navigationKeys } from "@/features/navigation/api/query-keys"
import { canAccessPath, getMenuUrls } from "@/features/navigation/lib/route-access"
// Planeador
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { toDateOnly, todayDateOnly } from "@/features/planeador/lib/format-date"
import { fetchMatriculasGrupo } from "@/features/planeador/api/query/use-actividad-matriculas-grupo-query"
import { fetchDocenteGradoAsignatura } from "@/features/planeador/api/query/use-docente-grado-asignatura-query"
import { fetchDocenteGrupos } from "@/features/planeador/api/query/use-docente-grupos-query"
import { fetchPeriodosEvaluacion } from "@/features/planeador/api/query/use-planeador-periodos-evaluacion-query"
import { fetchPlanillaCalificaciones } from "@/features/planeador/api/query/use-planilla-calificaciones-query"
import { fetchPlanillaColumnas } from "@/features/planeador/api/query/use-planilla-columnas-query"
import { fetchSoportesEstudiante } from "@/features/planeador/api/query/use-soportes-estudiante-query"
import { fetchTodasLasActividadesMias, fetchActividadesMias } from "@/features/planeador/api/query/use-actividades-mias-query"
import { actividadDetalleQueryOptions } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { fetchUnidadDetalle, fetchUnidades } from "@/features/planeador/api/query/use-unidades-query"
import { fetchActividadesCalendario } from "@/features/planeador/api/query/use-actividades-calendario-query"
import { fetchActividadesStats } from "@/features/planeador/api/query/use-actividades-stats-query"
import {
  fetchActividadesTabs,
  type ActividadTab,
  type ActividadTabPair,
} from "@/features/planeador/api/query/use-actividades-tabs-query"
import { fetchUnidadesTabs } from "@/features/planeador/api/query/use-unidades-tabs-query"
import { fetchUnidadReferente } from "@/features/planeador/api/query/use-unidad-referente-query"
import { fetchUnidadActividades } from "@/features/planeador/api/query/use-unidad-actividades-query"
import { fetchInstrumentoActividad } from "@/features/planeador/api/query/use-instrumento-actividad-query"
import { fetchRotuloActividad } from "@/features/planeador/api/query/use-rotulo-actividad-query"
import { fetchPlaneadorDocentes } from "@/features/planeador/api/query/use-planeador-docentes-query"
import { fetchReferenteCurricular } from "@/features/planeador/api/query/use-referente-curricular-query"
// Asistencia
import { asistenciaKeys } from "@/features/academic-management/asistencia/api/query-keys"
import { fetchSedesOpciones } from "@/features/academic-management/asistencia/api/query/use-sedes-opciones-query"
import { fetchAsistenciaCalendario } from "@/features/academic-management/asistencia/api/query/use-asistencia-calendario-query"
import { fetchAsistenciaResumenHoras } from "@/features/academic-management/asistencia/api/query/use-asistencia-resumen-horas-query"
import { fetchEstudiantesSesion } from "@/features/academic-management/asistencia/api/query/use-asistencia-roster-query"
import { agruparPorBloquesContinuos, compararPorHora } from "@/features/academic-management/asistencia/api/ui-mappings"
import type {
  AsistenciaSesionEstudiantesParams,
  SesionCalendario,
} from "@/features/academic-management/asistencia/api/types/asistencia"
import { fechasResumenDelMes, toIsoDate } from "@/features/academic-management/asistencia/lib/fechas"
// Informes
import {
  aniosInformeQueryKey,
  fetchAniosInforme,
  fetchJornadasInforme,
  fetchSedesInforme,
  jornadasInformeQueryKey,
  sedesInformeQueryKey,
} from "@/features/academic-management/reports/api/query/use-cascada-query"
import {
  fetchPeriodosInforme,
  periodosInformeQueryKey,
  type PeriodosInformeParams,
} from "@/features/academic-management/reports/api/query/use-periodos-informe-query"
import { fetchGruposPeriodo, gruposPeriodoQueryKey } from "@/features/academic-management/reports/api/query/use-grupos-periodo-query"
import { fetchInformeGrupo, informeGrupoQueryKey } from "@/features/academic-management/reports/api/query/use-informe-grupo-query"
import type { PeriodoInforme } from "@/features/academic-management/reports/api/types"
// Referentes curriculares
import {
  curricularReferencesQueryKey,
  fetchCurricularReferences,
} from "@/features/academic-management/curricular-references/api/query/use-curricular-references"
import {
  curricularReferenceQueryKey,
  fetchCurricularReference,
} from "@/features/academic-management/curricular-references/api/query/use-curricular-reference"
import {
  curricularReferenceAreasQueryKey,
  fetchCurricularReferenceAreas,
} from "@/features/academic-management/curricular-references/api/query/use-curricular-reference-areas"
import {
  curricularReferenceGradesQueryKey,
  fetchCurricularReferenceGrades,
} from "@/features/academic-management/curricular-references/api/query/use-curricular-reference-grades"
import {
  curricularStatementsQueryKey,
  fetchStatements,
} from "@/features/academic-management/curricular-references/api/query/use-curricular-statements"
import {
  curricularEvidencesQueryKey,
  fetchEvidences,
} from "@/features/academic-management/curricular-references/api/query/use-curricular-evidences"
import {
  educationLevelsQueryKey,
  fetchEducationLevels,
} from "@/features/academic-management/curricular-references/api/query/use-education-levels"
import {
  fetchSubjectLabelOptions,
  subjectLabelOptionsQueryKey,
} from "@/features/academic-management/curricular-references/api/query/use-subject-label-options"
import {
  fetchResolvedSubjectLabel,
  resolvedSubjectLabelQueryKey,
} from "@/features/academic-management/curricular-references/api/query/use-subject-label-resolution"
// Comunicaciones y notificaciones
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import { fetchConversaciones } from "@/features/comunicaciones/chat/api/query/use-conversaciones-query"
import { fetchPoliticaChat } from "@/features/comunicaciones/chat/api/query/use-politica-chat-query"
import { contadorQueryKey, fetchContador } from "@/features/notificaciones/api/query/use-contador-query"
import {
  fetchNotificaciones,
  notificacionesListaQueryKey,
} from "@/features/notificaciones/api/query/use-notificaciones-query"
import { fetchPreferencias, preferenciasQueryKey } from "@/features/notificaciones/api/query/use-preferencias-query"
// Establecimiento (solo consulta sin red)
import { establishmentKeys } from "@/features/establishment/institution/api/query-keys"
import { establishmentsQueryKey, fetchEstablishments } from "@/features/establishment/institution/api/query/use-establishments"
import { fetchEstablishmentsOptions } from "@/features/establishment/institution/api/query/use-establishments-options"
import { campusKeys } from "@/features/establishment/campuses/api/query-keys"
import { campusesQueryKey, fetchCampuses } from "@/features/establishment/campuses/api/query/use-campuses"
import { fetchZonasSede } from "@/features/establishment/campuses/api/query/use-zonas-sede"
import { getCatalog } from "@/features/establishment/employees/api/query/use-catalogs"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { fetchAcademicPeriods } from "@/features/establishment/academic-period/api/query/use-academic-periods"
import { fetchAcademicPeriod } from "@/features/establishment/academic-period/api/query/use-academic-period"
import { fetchEvaluationPeriods } from "@/features/establishment/academic-period/api/query/use-evaluation-periods"
import { selectCategoryQueryOptions } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { fetchSedeOptions } from "@/features/establishment/academic-period/api/query/use-sede-options"
import { fetchSedePreviousPeriods } from "@/features/establishment/academic-period/api/query/use-sede-previous-periods-query"

// ---- Piezas -----------------------------------------------------------------

interface SeedOptions<T> {
  /** Si falla no cuenta como error (endpoint que depende del rol, dato accesorio). */
  optional?: boolean
  /** Tareas que salen de la respuesta (listas → detalle de cada elemento). */
  then?: (data: T) => PrepareTask[]
}

/**
 * Pide una query con la key/fn/meta de la pantalla. Lo fresco no se pide y lo
 * que el servidor confirma sin cambios (304) no se baja (`prepareQuery`).
 */
export function seed<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  meta: AppQueryMeta,
  { optional, then }: SeedOptions<T> = {},
): PrepareTask {
  return {
    queryKey,
    meta,
    optional,
    expands: then != null,
    run: async (queryClient: QueryClient, ctx: PrepareContext) => {
      const data = await prepareQuery(queryClient, ctx, {
        queryKey,
        meta,
        fetch: () => queryClient.fetchQuery({ queryKey, queryFn, meta, staleTime: 0 }),
      })
      return then?.(data as T)
    },
  }
}

/** Categoría de `TLISTA_VALOR` con la misma key que usan las pantallas. */
function seedListaValor(categoria: string, options?: SeedOptions<unknown>): PrepareTask {
  const { queryKey, queryFn, meta } = selectCategoryQueryOptions(categoria)
  return seed(queryKey, queryFn, meta, options)
}

const ROTULO_DIAS_VECINOS = 15
const ASISTENCIA_DIAS_ROSTER = 14
const MAX_MESES = 12

export interface PrepareTaskOptions {
  grupos: { grupoId: number; gradoId: number; nombre: string }[]
  asignaturas: { gradoId: number; asignaturaId: number; nombre: string }[]
  periodos: { id: number; nombre: string; startDate: string; endDate: string }[]
}

export interface BuildPrepareTasksInput {
  options: PrepareTaskOptions
  selection: PrepareSelection
  incluirArchivos: boolean
  /** Roles del token: lo que depende del rol se pide como opcional. */
  roles: readonly string[]
  /** Hoy (inyectable para tests). */
  now?: Date
}

/** Meses (año, mes 1-12) entre los periodos elegidos; sin periodos, el actual. */
export function mesesDelRango(
  periodos: { startDate: string; endDate: string }[],
  now: Date = new Date(),
): { anio: number; mes: number }[] {
  const desde = periodos.map((p) => p.startDate).sort()[0]
  const hasta = periodos.map((p) => p.endDate).sort().at(-1)
  const inicio = desde ? new Date(`${desde}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), 1)
  const fin = hasta ? new Date(`${hasta}T00:00:00`) : inicio
  const meses: { anio: number; mes: number }[] = []
  for (let d = new Date(inicio.getFullYear(), inicio.getMonth(), 1); d <= fin && meses.length < MAX_MESES; ) {
    meses.push({ anio: d.getFullYear(), mes: d.getMonth() + 1 })
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  }
  if (meses.length === 0) meses.push({ anio: now.getFullYear(), mes: now.getMonth() + 1 })
  return meses
}

/** ¿El menú del usuario (guardado en el cache) abre esta ruta? */
function menuIncludes(queryClient: QueryClient, pathname: string): boolean {
  const menu = queryClient.getQueryData<{ url: string; items?: { url: string }[] }[]>(navigationKeys.menu)
  if (!menu) return false
  return canAccessPath(pathname, getMenuUrls(menu))
}

const PLANEADOR_PATH = "/app/planeador/actividades"
const ASISTENCIA_PATH = "/app/asistencia"

/**
 * Qué módulos con datos de docente tiene el usuario en el menú. Un acudiente o
 * un estudiante no tienen planeador ni asistencia: pedirles
 * `/planeador/docentes/*` respondía 403 y cada 403 revalidaba la sesión (ver
 * `refreshAccessToken` en `api-client.ts`). El guard de `/app` siempre deja
 * el menú en el cache antes de montar la app, así que leerlo acá es fiable.
 */
export function prepareModules(queryClient: QueryClient): { planeador: boolean; asistencia: boolean } {
  return {
    planeador: menuIncludes(queryClient, PLANEADOR_PATH),
    asistencia: menuIncludes(queryClient, ASISTENCIA_PATH),
  }
}

// ---- Planeador ----------------------------------------------------------------

function catalogosPlaneador(): PrepareTask[] {
  return [
    seed(planeadorKeys.sedesOpciones(), fetchSedesOpciones, proveedorMeta()),
    seed(planeadorKeys.periodosEvaluacion(), fetchPeriodosEvaluacion, proveedorMeta()),
    seedListaValor("TIPO_ASISTENCIA"),
    seedListaValor("TIPO_ACTIVIDAD"),
    seedListaValor("MOMENTO_REGISTRO"),
    seedListaValor("AGRUPACION_PLANILLA"),
    seedListaValor("TIPO_ADAPTACION"),
    // Formulario de actividad (crear/editar sin red): instrumentos y dominios
    // permitidos de los materiales.
    seedListaValor("INSTRUMENTO_EVALUACION"),
    seedListaValor("DOMINIO_MATERIAL_URL", { optional: true }),
    seedListaValor("DOMINIO_MATERIAL_REPOSITORIO", { optional: true }),
    // Jornadas: las usan el chat (selector de personas) y los periodos.
    seedListaValor("JORNADA", { optional: true }),
    seed(planeadorKeys.docenteGrupos(), () => fetchDocenteGrupos(), offlineMeta(TTL_OFFLINE.grupo)),
    seed(planeadorKeys.docenteGradoAsignatura(), () => fetchDocenteGradoAsignatura(), offlineMeta(TTL_OFFLINE.grupo)),
  ]
}

/** Rail por día: el día pedido y, siguiendo la respuesta, los días ocupados vecinos. */
function railTasks(pares: ActividadTabPair[] | undefined, dia: string, sentido: "ambos" | "antes" | "despues", restantes: number): PrepareTask {
  const params = { size: 50, offset: 0, dia, gradoAsignaturaPares: pares }
  return seed(planeadorKeys.actividades.mias(params), () => fetchActividadesMias(params), offlineMeta(TTL_OFFLINE.grupo), {
    then: (result) => {
      if (restantes <= 0) return []
      const next: PrepareTask[] = []
      if (sentido !== "despues" && result.diaAnterior) next.push(railTasks(pares, result.diaAnterior, "antes", restantes - 1))
      if (sentido !== "antes" && result.diaSiguiente) next.push(railTasks(pares, result.diaSiguiente, "despues", restantes - 1))
      return next
    },
  })
}

/** Resumen, calendario de cada mes y rail de una pestaña de rótulo (o sin pestañas). */
function vistaActividadesTasks(pares: ActividadTabPair[] | undefined, meses: { anio: number; mes: number }[], hoy: string): PrepareTask[] {
  const stats = { gradoAsignaturaPares: pares }
  return [
    seed(planeadorKeys.actividades.stats(stats), () => fetchActividadesStats(stats), offlineMeta(TTL_OFFLINE.grupo)),
    ...meses.map(({ anio, mes }) => {
      const params = {
        fechaDesde: toDateOnly(new Date(anio, mes - 1, 1)),
        fechaHasta: toDateOnly(new Date(anio, mes, 0)),
        gradoAsignaturaPares: pares,
      }
      return seed(planeadorKeys.actividades.calendario(params), () => fetchActividadesCalendario(params), offlineMeta(TTL_OFFLINE.grupo))
    }),
    railTasks(pares, hoy, "ambos", ROTULO_DIAS_VECINOS),
  ]
}

function actividadesTasks(meses: { anio: number; mes: number }[], hoy: string): PrepareTask[] {
  return [
    // Pestañas de rótulo: cada una acota el resumen, el calendario y el rail.
    seed(planeadorKeys.actividades.tabs(), () => fetchActividadesTabs({}), offlineMeta(TTL_OFFLINE.grupo), {
      then: (tabs: ActividadTab[]) =>
        tabs.length === 0
          ? vistaActividadesTasks(undefined, meses, hoy)
          : tabs.flatMap((tab) => vistaActividadesTasks(tab.pares, meses, hoy)),
    }),
    seed(planeadorKeys.unidades.tabs(), () => fetchUnidadesTabs({}), offlineMeta(TTL_OFFLINE.grupo)),
    // Detalle de TODAS las actividades del docente (abrirlas sin red).
    {
      queryKey: ["offline", "prepare", "actividades"],
      expands: true,
      run: async () => {
        const actividades = await fetchTodasLasActividadesMias()
        return actividades.map((actividad): PrepareTask => {
          const queryKey = planeadorKeys.actividad.detalle(actividad.id)
          const meta = estudiantesMeta()
          return {
            queryKey,
            meta,
            run: async (client, ctx) => {
              const options = actividadDetalleQueryOptions(actividad.id, client)
              await prepareQuery(client, ctx, {
                queryKey,
                meta,
                fetch: () => client.fetchQuery({ ...options, staleTime: 0 }),
              })
            },
          }
        })
      },
    },
  ]
}

function unidadesTasks(): PrepareTask[] {
  const lista = {}
  return [
    seed(planeadorKeys.unidades.lista(lista), () => fetchUnidades(lista), offlineMeta(TTL_OFFLINE.grupo), {
      then: (result) =>
        result.rows.flatMap((unidad) => [
          seed(planeadorKeys.unidad.detalle(unidad.id), () => fetchUnidadDetalle(unidad.id), offlineMeta(TTL_OFFLINE.grupo)),
          seed(planeadorKeys.unidad.actividades(unidad.id), () => fetchUnidadActividades(unidad.id), offlineMeta(TTL_OFFLINE.grupo)),
          seed(planeadorKeys.unidad.referente(unidad.id), () => fetchUnidadReferente(unidad.id), offlineMeta(TTL_OFFLINE.grupo), {
            then: (referente) => (referente.id != null ? [subjectLabelTask(referente.id)] : []),
          }),
        ]),
    }),
  ]
}

/** Nombre de la asignatura según el referente (`useResolvedSubjectLabelQuery`). */
function subjectLabelTask(referenceId: number): PrepareTask {
  return seed(resolvedSubjectLabelQueryKey(referenceId), () => fetchResolvedSubjectLabel(referenceId), catalogoMeta(), {
    optional: true,
  })
}

/** Estudiantes por grupo: solo docente/director, a los demás el backend responde 403. */
function grupoTasks(grupoIds: number[], roles: readonly string[]): PrepareTask[] {
  if (!roles.some((r) => /DOCENTE|DIRECTOR_GRUPO/.test(r))) return []
  return grupoIds.map((grupoId) =>
    seed(planeadorKeys.matriculasGrupo(grupoId), () => fetchMatriculasGrupo(grupoId), estudiantesMeta()),
  )
}

/** Archivos de una celda: la lista de soportes y el contenido de cada uno. */
function archivoTasks(pkTactividadEstudiante: number, archivoIds: number[]): PrepareTask[] {
  return [
    seed(
      planeadorKeys.actividadEstudiante.soportes(pkTactividadEstudiante),
      () => fetchSoportesEstudiante(pkTactividadEstudiante),
      estudiantesMeta(),
    ),
    ...archivoIds.map(
      (archivoId): PrepareTask => ({
        queryKey: ["archivo", archivoId],
        run: async (_client, ctx) => {
          ctx.stats.archivoBytes += await cacheArchivo(archivoId)
        },
      }),
    ),
  ]
}

/** Planilla con los MISMOS params que la pantalla, su rótulo, el referente del
 *  grado y el instrumento de cada actividad (popover de la celda). */
function planillaTasks(targets: PlanillaTarget[], incluirArchivos: boolean): PrepareTask[] {
  const porGrado = new Set<string>()
  const extras: PrepareTask[] = []
  for (const t of targets) {
    const clave = `${t.gradoId}:${t.asignaturaId}`
    if (porGrado.has(clave)) continue
    porGrado.add(clave)
    extras.push(
      seed(
        planeadorKeys.rotuloActividad(t.gradoId, t.asignaturaId),
        () => fetchRotuloActividad(t.gradoId, t.asignaturaId, undefined),
        offlineMeta(TTL_OFFLINE.detalle),
        { optional: true },
      ),
    )
  }
  // Nombre de la asignatura en la grilla (`useStudyPlanSubjectLabel(gradoId)`).
  for (const gradoId of new Set(targets.map((t) => t.gradoId))) {
    extras.push(
      seed(planeadorKeys.referenteCurricular(gradoId), () => fetchReferenteCurricular(gradoId, undefined), catalogoMeta(), {
        optional: true,
        then: (referente) => (referente.id != null ? [subjectLabelTask(referente.id)] : []),
      }),
    )
  }
  return [
    ...targets.flatMap((params): PrepareTask[] => [
      seed(planeadorKeys.planilla.columnas(params), () => fetchPlanillaColumnas(params), offlineMeta(TTL_OFFLINE.grupo), {
        then: (columnas) =>
          columnas.map((columna) =>
            seed(
              planeadorKeys.actividad.instrumento(columna.pkTactividad),
              () => fetchInstrumentoActividad(columna.pkTactividad),
              offlineMeta(TTL_OFFLINE.grupo),
              { optional: true },
            ),
          ),
      }),
      seed(
        planeadorKeys.planilla.calificaciones.lista(params),
        () => fetchPlanillaCalificaciones(params),
        estudiantesMeta(),
        {
          then: (data) =>
            incluirArchivos
              ? data.rows.flatMap((fila) =>
                  fila.celdas
                    .filter((celda) => celda.evidencias.length > 0)
                    .flatMap((celda) => archivoTasks(celda.pkTactividadEstudiante, celda.evidencias.map((e) => e.fkTarchivo))),
                )
              : [],
        },
      ),
    ]),
    ...extras,
  ]
}

// ---- Asistencia -----------------------------------------------------------------

function rosterTasks(sesiones: SesionCalendario[], desde: string, hasta: string): PrepareTask[] {
  const porFecha = new Map<string, SesionCalendario[]>()
  for (const s of sesiones) {
    if (s.fecha < desde || s.fecha > hasta) continue
    porFecha.set(s.fecha, [...(porFecha.get(s.fecha) ?? []), s])
  }
  const tasks: PrepareTask[] = []
  for (const [fecha, delDia] of porFecha) {
    for (const sesion of agruparPorBloquesContinuos(delDia).sort(compararPorHora)) {
      const base: Omit<AsistenciaSesionEstudiantesParams, "BLOQUE"> = {
        GRUPO: sesion.fkGrupo,
        FECHA: fecha,
        ...(sesion.esFormativa ? { ACTIVIDAD: sesion.fkActividad ?? undefined } : { ASIGNATURA: sesion.fkAsignatura }),
      }
      for (const bloque of sesion.bloques) {
        const params: AsistenciaSesionEstudiantesParams = { ...base, ...(bloque !== null && { BLOQUE: bloque }) }
        tasks.push(seed(asistenciaKeys.sesionEstudiantes(params), () => fetchEstudiantesSesion(params), estudiantesMeta()))
      }
    }
  }
  return tasks
}

function asistenciaTasks(meses: { anio: number; mes: number }[], now: Date): PrepareTask[] {
  const hoy = toIsoDate(now)
  const limite = toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + ASISTENCIA_DIAS_ROSTER))
  const mesActual = { anio: now.getFullYear(), mes: now.getMonth() + 1 }
  const mesSiguiente = { anio: new Date(now.getFullYear(), now.getMonth() + 1, 1).getFullYear(), mes: new Date(now.getFullYear(), now.getMonth() + 1, 1).getMonth() + 1 }
  const conMesesCercanos = [...meses]
  for (const m of [mesActual, mesSiguiente]) {
    if (!conMesesCercanos.some((x) => x.anio === m.anio && x.mes === m.mes)) conMesesCercanos.push(m)
  }
  return [
    seed(planeadorKeys.sedesOpciones(), fetchSedesOpciones, proveedorMeta(), {
      then: (sedes) =>
        sedes.flatMap((sede) => {
          const SEDE = sede.pk_sede
          return [
            ...conMesesCercanos.flatMap(({ anio, mes }) => {
              const todas = { SEDE, ANIO: anio, MES: mes }
              const mias = { SEDE, ANIO: anio, MES: mes, MIAS: true }
              const cercano = [mesActual, mesSiguiente].some((m) => m.anio === anio && m.mes === mes)
              return [
                seed(asistenciaKeys.calendario(todas), () => fetchAsistenciaCalendario(todas), offlineMeta(TTL_OFFLINE.grupo)),
                // "Mis clases" (solo docentes): sus sesiones dan las listas
                // de estudiantes del registro manual de las próximas semanas.
                seed(asistenciaKeys.calendario(mias), () => fetchAsistenciaCalendario(mias), offlineMeta(TTL_OFFLINE.grupo), {
                  optional: true,
                  then: (sesiones) => (cercano ? rosterTasks(sesiones, hoy, limite) : []),
                }),
              ]
            }),
            ...[mesActual, mesSiguiente].flatMap(({ anio, mes }) =>
              fechasResumenDelMes(anio, mes).map((FECHA) => {
                const params = { SEDE, FECHA }
                return seed(asistenciaKeys.resumenHoras(params), () => fetchAsistenciaResumenHoras(params), offlineMeta(TTL_OFFLINE.grupo))
              }),
            ),
          ]
        }),
    }),
  ]
}

// ---- Informes ---------------------------------------------------------------

/** Mismo default que la página: los periodos en curso, si no el primero. */
export function periodosPorDefecto(periodos: PeriodoInforme[]): number[] {
  const enCurso = periodos.filter((p) => p.enCurso).map((p) => p.id)
  if (enCurso.length > 0) return enCurso
  return periodos.length > 0 ? [periodos[0].id] : []
}

function informesTasks(): PrepareTask[] {
  return [
    seed(sedesInformeQueryKey(), fetchSedesInforme, offlineMeta(TTL_OFFLINE.grupo), {
      then: (sedes) =>
        sedes.map((sede) =>
          seed(aniosInformeQueryKey(sede.id), () => fetchAniosInforme(sede.id), offlineMeta(TTL_OFFLINE.grupo), {
            then: (anios) => {
              const anio = (anios.find((a) => a.esActual) ?? anios[0])?.anio
              if (anio == null) return []
              return [
                seed(jornadasInformeQueryKey(sede.id, anio), () => fetchJornadasInforme(sede.id, anio), offlineMeta(TTL_OFFLINE.grupo), {
                  then: (jornadas) => jornadas.map((jornada) => cascadaJornada({ sedeId: sede.id, anio, jornadaId: jornada.id })),
                }),
              ]
            },
          }),
        ),
    }),
  ]
}

function cascadaJornada(filtros: PeriodosInformeParams): PrepareTask {
  return seed(periodosInformeQueryKey(filtros), () => fetchPeriodosInforme(filtros), offlineMeta(TTL_OFFLINE.grupo), {
    then: (periodos) => {
      const porDefecto = periodosPorDefecto(periodos)
      return [
        seed(gruposPeriodoQueryKey(filtros), () => fetchGruposPeriodo(filtros), offlineMeta(TTL_OFFLINE.grupo), {
          then: (grupos) =>
            porDefecto.length === 0
              ? []
              : [
                  ...grupos.map((grupo) => {
                    const params = { grupoId: grupo.grupoId, periodos: porDefecto }
                    return seed(informeGrupoQueryKey(params), () => fetchInformeGrupo(params), estudiantesMeta(), { optional: true })
                  }),
                  // Referente por grado: los grupos de informes no salen de `planillaTasks`.
                  ...[...new Set(grupos.map((g) => g.gradoId).filter((id): id is number => id != null))].map(
                    (gradoId) =>
                      seed(planeadorKeys.referenteCurricular(gradoId), () => fetchReferenteCurricular(gradoId, undefined), catalogoMeta(), {
                        optional: true,
                        then: (referente) => (referente.id != null ? [subjectLabelTask(referente.id)] : []),
                      }),
                  ),
                ],
        }),
      ]
    },
  })
}

// ---- Referentes curriculares --------------------------------------------------

const REFERENTES_PAGE_SIZE = 10

function referenteDetalleTasks(id: number): PrepareTask[] {
  return [
    seed(curricularReferenceAreasQueryKey(id), () => fetchCurricularReferenceAreas(id), catalogoMeta()),
    seed(curricularReferenceQueryKey(id), () => fetchCurricularReference(id), catalogoMeta(), {
      then: (referencia) => [
        seed(curricularReferenceGradesQueryKey(id), () => fetchCurricularReferenceGrades(id), catalogoMeta(), {
          then: (grados) => {
            // Igual que abre la pestaña: primera área, primer grado y primer enunciado.
            const areaId = referencia.areas.length > 0 ? (referencia.areas[0].id as number) : null
            const gradeId = grados.length > 0 ? grados[0].id : null
            return [
              seed(curricularStatementsQueryKey(id, areaId, gradeId), () => fetchStatements(id, areaId, gradeId), catalogoMeta(), {
                then: (enunciados) =>
                  enunciados.length > 0
                    ? [seed(curricularEvidencesQueryKey(enunciados[0].id), () => fetchEvidences(enunciados[0].id), catalogoMeta(), { optional: true })]
                    : [],
              }),
            ]
          },
        }),
      ],
    }),
  ]
}

function referentesPagina(pageIndex: number): PrepareTask {
  const params = { filters: {}, sorting: [], pageIndex, pageSize: REFERENTES_PAGE_SIZE }
  return seed(curricularReferencesQueryKey(params), () => fetchCurricularReferences(params), catalogoMeta(), {
    then: (result) => [
      // La página 0 encadena las siguientes (se navegan sin red).
      ...(pageIndex === 0
        ? Array.from({ length: Math.max(0, result.pageCount - 1) }, (_, i) => referentesPagina(i + 1))
        : []),
      ...result.rows.flatMap((referencia) => referenteDetalleTasks(referencia.id)),
    ],
  })
}

function referentesTasks(): PrepareTask[] {
  return [
    seed(educationLevelsQueryKey(), fetchEducationLevels, catalogoMeta()),
    seedListaValor("ENFOQUE_PEDAGOGICO"),
    seedListaValor("TIPO_EVALUACION"),
    seed(subjectLabelOptionsQueryKey(), fetchSubjectLabelOptions, catalogoMeta()),
    referentesPagina(0),
  ]
}

// ---- Comunicaciones, notificaciones y establecimiento --------------------------

function comunicacionesTasks(): PrepareTask[] {
  return [
    seed(chatKeys.conversaciones, fetchConversaciones, offlineMeta(TTL_OFFLINE.detalle)),
    seed(chatKeys.politica, fetchPoliticaChat, catalogoMeta(), { optional: true }),
  ]
}

function notificacionesTasks(): PrepareTask[] {
  const lista = notificacionesListaQueryKey({})
  const meta = offlineMeta(TTL_OFFLINE.detalle)
  return [
    {
      queryKey: lista,
      meta,
      optional: true,
      run: async (queryClient, ctx) => {
        await prepareQuery(queryClient, ctx, {
          queryKey: lista,
          meta,
          fetch: () =>
            queryClient.fetchInfiniteQuery({
              queryKey: lista,
              queryFn: ({ pageParam }) => fetchNotificaciones({}, pageParam),
              initialPageParam: null as string | null,
              getNextPageParam: (last: { nextCursor: string | null }) => last.nextCursor,
              meta,
              staleTime: 0,
            }),
        })
      },
    },
    seed(contadorQueryKey, fetchContador, { ...offlineMeta(TTL_OFFLINE.detalle), offlineOptional: true }, { optional: true }),
    seed(preferenciasQueryKey, fetchPreferencias, offlineMeta(TTL_OFFLINE.detalle), { optional: true }),
  ]
}

const LISTA_POR_DEFECTO = { filters: {}, sorting: [], pageIndex: 0, pageSize: 10 }

function establecimientoTasks(queryClient: QueryClient, roles: readonly string[]): PrepareTask[] {
  const tasks: PrepareTask[] = []
  if (menuIncludes(queryClient, "/app/establecimiento-educativo/general")) {
    tasks.push(
      seed(establishmentsQueryKey(LISTA_POR_DEFECTO), () => fetchEstablishments(LISTA_POR_DEFECTO), proveedorMeta()),
      seed(["catalogs", CATALOGS.ENTITY_STATUSES], () => getCatalog(CATALOGS.ENTITY_STATUSES), catalogoMeta(), { optional: true }),
    )
  }
  if (menuIncludes(queryClient, "/app/establecimiento-educativo/sedes")) {
    tasks.push(
      seed(campusesQueryKey(LISTA_POR_DEFECTO), () => fetchCampuses(LISTA_POR_DEFECTO), proveedorMeta()),
      seed(["catalogs", CATALOGS.ZONES], () => getCatalog(CATALOGS.ZONES), catalogoMeta(), { optional: true }),
      // Solo super administrador; a los demás les responde 403.
      ...(roles.includes("CEVAL-SUPER_ADMINISTRADOR")
        ? [seed(establishmentKeys.options(), fetchEstablishmentsOptions, proveedorMeta(), { optional: true })]
        : []),
      seed(campusKeys.zonas(null), () => fetchZonasSede(null), catalogoMeta(), { optional: true }),
    )
  }
  if (menuIncludes(queryClient, "/app/establecimiento-educativo/periodos")) {
    tasks.push(
      seedListaValor("ESTADOPERIODO"),
      seedListaValor("ESTADOPERIODOEVALUACION", { optional: true }),
      seed(academicPeriodKeys.sedeOptions(), fetchSedeOptions, proveedorMeta(), { optional: true }),
      seed(academicPeriodKeys.academicPeriods.list(LISTA_POR_DEFECTO), () => fetchAcademicPeriods(LISTA_POR_DEFECTO), proveedorMeta(), {
        then: (result) =>
          result.rows.flatMap((periodo) => {
            const evaluacion = { ...LISTA_POR_DEFECTO, academicPeriodId: periodo.id }
            return [
              seed(academicPeriodKeys.academicPeriod.detail(periodo.id), () => fetchAcademicPeriod(periodo.id), proveedorMeta(), {
                then: (detalle) => {
                  const sedeId = (detalle as { sedeId?: string | number | null }).sedeId
                  if (sedeId == null || sedeId === "") return []
                  return [
                    seed(
                      academicPeriodKeys.academicPeriods.previousBySede(String(sedeId), periodo.id),
                      () => fetchSedePreviousPeriods(String(sedeId), periodo.id),
                      proveedorMeta(),
                      { optional: true },
                    ),
                  ]
                },
              }),
              // `enabled` no entra en la key (`withoutEnabled`), igual que en la pantalla.
              seed(academicPeriodKeys.evaluationPeriods.list({ ...evaluacion, enabled: true }), () => fetchEvaluationPeriods(evaluacion), proveedorMeta(), {
                optional: true,
              }),
            ]
          }),
      }),
    )
  }
  return tasks
}

/** Rector/coordinador ven el planeador de sus docentes (aviso de lectura). */
function docentesTasks(roles: readonly string[]): PrepareTask[] {
  const esDirectivo = roles.some((r) => /RECTOR|COORDINADOR|SUPER_ADMINISTRADOR/.test(r))
  if (!esDirectivo) return []
  return [seed(planeadorKeys.docentes(), () => fetchPlaneadorDocentes(), proveedorMeta(), { optional: true })]
}

// ---- Opciones de la selección -------------------------------------------------

/**
 * Grupos, asignaturas y periodos del docente para elegir qué preparar. Cada
 * fuente puede fallar sola (un rector no dicta grupos): lo que falla queda
 * vacío y se prepara igual lo demás.
 */
export async function fetchPrepareOptions(queryClient: QueryClient): Promise<PrepareTaskOptions> {
  const { planeador, asistencia } = prepareModules(queryClient)
  const ninguno = Promise.resolve([] as never[])
  // Sin planeador no hay grupos ni asignaturas de docente que elegir; los
  // periodos además ubican los meses de la asistencia. Un 403 (rol sin
  // alcance) queda como lista vacía: "no aplica", no un error que reintentar.
  const [grupos, pares, periodos] = await Promise.allSettled([
    planeador ? fetchDocenteGrupos() : ninguno,
    planeador ? fetchDocenteGradoAsignatura() : ninguno,
    planeador || asistencia ? fetchPeriodosEvaluacion() : ninguno,
  ])
  return {
    grupos:
      grupos.status === "fulfilled"
        ? grupos.value.map((g) => ({ grupoId: g.grupoId, gradoId: g.gradoId, nombre: `${g.gradoNombre} · ${g.grupoNombre}` }))
        : [],
    asignaturas:
      pares.status === "fulfilled"
        ? pares.value.map((p) => ({ gradoId: p.gradoId, asignaturaId: p.asignaturaId, nombre: p.asignaturaNombre }))
        : [],
    periodos:
      periodos.status === "fulfilled"
        ? periodos.value.map((p) => ({ id: p.id, nombre: p.nombre, startDate: p.startDate, endDate: p.endDate }))
        : [],
  }
}

// ---- Todo junto ---------------------------------------------------------------

/**
 * Además de lo elegido, refresca las queries persistibles (`meta.offline`)
 * que ya están en memoria: lo que el docente abrió en esta sesión con filtros
 * propios (otra página, otra búsqueda) se reusa con su key y `queryFn` exactas.
 */
export function cachedOfflineTasks(queryClient: QueryClient, seeded: Set<string>): PrepareTask[] {
  return queryClient
    .getQueryCache()
    .findAll({ predicate: (query) => Boolean(query.meta?.offline) && !seeded.has(query.queryHash) && Boolean(query.options.queryFn) })
    .map((query) => ({
      queryKey: query.queryKey,
      meta: query.meta,
      optional: true,
      run: async (client: QueryClient, ctx: PrepareContext) => {
        await prepareQuery(client, ctx, {
          queryKey: query.queryKey,
          meta: query.meta,
          fetch: () =>
            client.refetchQueries({ queryKey: query.queryKey, exact: true, type: "all" }, { throwOnError: true }),
        })
      },
    }))
}

export function buildPrepareTasks(queryClient: QueryClient, input: BuildPrepareTasksInput): PrepareTask[] {
  const now = input.now ?? new Date()
  const hoy = todayDateOnly()
  const periodosElegidos = input.options.periodos.filter((p) => input.selection.periodos.has(p.id))
  const meses = mesesDelRango(periodosElegidos, now)
  const targets = buildPlanillaTargets(input.options.grupos, input.options.asignaturas, input.selection)

  const { planeador, asistencia } = prepareModules(queryClient)
  const tasks: PrepareTask[] = [
    ...(planeador
      ? [
          ...catalogosPlaneador(),
          ...grupoTasks([...input.selection.grupos], input.roles),
          ...actividadesTasks(meses, hoy),
          ...unidadesTasks(),
          ...docentesTasks(input.roles),
          ...planillaTasks(targets, input.incluirArchivos),
        ]
      : []),
    ...(asistencia ? asistenciaTasks(meses, now) : []),
    ...notificacionesTasks(),
  ]
  if (menuIncludes(queryClient, "/app/gestion-academica/informes")) tasks.push(...informesTasks())
  if (menuIncludes(queryClient, "/app/gestion-academica/referentes-curriculares")) tasks.push(...referentesTasks())
  if (menuIncludes(queryClient, "/app/comunicaciones/chat")) tasks.push(...comunicacionesTasks())
  tasks.push(...establecimientoTasks(queryClient, input.roles))
  return tasks
}
