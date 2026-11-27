// Cobertura y Funcionarios para "Preparar": las MISMAS keys que arma cada pantalla al abrir sin filtros.
// Las pantallas solo-mock (pre-matrícula, reserva de cupo vieja, detalle de inscrito) no se siembran.
import {
  fetchMatriculados,
  fetchPeriodosInforme,
  informesKeys,
  matriculadosBody,
} from "@/features/coverage/informes-reportes/api/informes"
import type { InformesSearch } from "@/features/coverage/informes-reportes/api/schema"
import type { QueryClient, QueryKey } from "@tanstack/react-query"

import type { PrepareTask } from "@/features/offline/lib/prepare-engine"
import { menuIncludes, seed, seedListaValor } from "@/features/offline/lib/prepare-seed"
import { CATALOGS } from "@/lib/catalogs"
import { TTL_OFFLINE, catalogoMeta, offlineMeta, proveedorMeta, type AppQueryMeta } from "@/lib/offline/query-meta"
// Matrícula
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"
import { fetchSolicitudesPendientes } from "@/features/coverage/matricula/api/query/fetch-solicitudes-pendientes"
import { fetchMatriculaAsignaturas } from "@/features/coverage/matricula/api/query/use-matricula-asignaturas"
import { fetchMatriculaCampuses } from "@/features/coverage/matricula/api/query/use-matricula-campuses-query"
import { fetchMatriculaCapacidades } from "@/features/coverage/matricula/api/query/use-matricula-capacidades"
import { MATRICULA_CATALOG_CATEGORIA } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import { fetchGrados, fetchGrupos } from "@/features/coverage/matricula/api/query/use-matricula-dependent-catalogs-query"
import { fetchMatriculaDetail } from "@/features/coverage/matricula/api/query/use-matricula-detail-query"
import { fetchMatriculaFieldConfig } from "@/features/coverage/matricula/api/query/use-matricula-field-config-query"
import { fetchMatriculaPeriodosAbiertos } from "@/features/coverage/matricula/api/query/use-matricula-periodos-abiertos"
import {
  fetchMatricula,
  MATRICULA_LISTA_POR_DEFECTO,
  matriculaListaMeta,
} from "@/features/coverage/matricula/api/query/use-matricula-query"
import { fetchNotasHomologadas } from "@/features/coverage/matricula/api/query/use-notas-homologadas"
import { fetchPeriodoResolverMatricula } from "@/features/coverage/matricula/api/query/use-periodo-resolver-matricula"
import { fetchSnapshotPendiente } from "@/features/coverage/matricula/api/query/use-snapshot-pendiente"
import { fetchSoportes } from "@/features/coverage/matricula/api/soportes"
// Inscripción y reservas
import {
  configuracionKeys,
  fetchCatalogosConfiguracion,
  fetchGrupoAdmisionConfig,
  fetchGruposAdmisionConfig,
  fetchPeriodoConfig,
  fetchPeriodosConfig,
} from "@/features/coverage/inscripcion-reservas/api/query/use-configuracion-query"
import {
  fetchCatalogosInscripcion,
  fetchEstablecimientoId,
  fetchGruposAdmision,
  fetchInscripcionDetalle,
  fetchInscripciones,
  fetchOpcionesCupo,
  inscripcionesKeys,
  opcionesCupoKey,
} from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import { reservaKeys } from "@/features/coverage/inscripcion-reservas/api/query/use-reserva-detalle-query"
import { fetchReservaFicha } from "@/features/coverage/inscripcion-reservas/api/query/use-reserva-ficha-query"
import {
  fetchReservasCupo,
  fetchReservasCupoCatalogos,
  reservasCupoKeys,
} from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import {
  fetchCalendariosCobertura,
  fetchContextoTerritorial,
  fetchCuposContratados,
  fetchOrientaciones,
  fetchProyeccion,
  fetchProyeccionDetalle,
  fetchRedistribucion,
  fetchSeguimiento,
  fetchSeguimientoDetalle,
  fetchSolicitudesRetiro,
  fetchUbicados,
  territorialKeys,
} from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"
import { ESTADOS_OPCION_POR_DEFECTO } from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"
// Matrícula complementaria
import { convenioKeys, fetchConvenios } from "@/features/coverage/matricula-complementaria/api/convenios"
import {
  establecimientosComplementariaKey,
  fetchEstablecimientosComplementaria,
} from "@/features/coverage/matricula-complementaria/api/establecimientos"
import {
  convocatoriaKeys,
  fetchConvocatoria,
  fetchConvocatorias,
  fetchResultado,
  fetchSeleccionCupo,
} from "@/features/coverage/matricula-complementaria/api/convocatorias"
import { fetchPostulacion, fetchPostulaciones, postulacionKeys } from "@/features/coverage/matricula-complementaria/api/postulaciones"
// Promoción y actualización de datos
import {
  cuerpoPendientes,
  cuerpoReprobados,
  fetchAreasDelAnio,
  fetchDetallePromocion,
  fetchOpcionesPromocion,
  fetchPendientes,
  fetchReprobados,
  promocionKeys,
} from "@/features/coverage/promocion-nivelacion/api/promocion"
import {
  actualizacionKeys,
  cuerpoSolicitudes,
  fetchConfiguracionActualizacion,
  fetchEstablecimientosActualizacion,
  fetchPendientesCount,
  fetchSolicitudes,
} from "@/features/coverage/actualizacion-datos/api/actualizacion"
// Establecimiento
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { selectCategoryQueryOptions } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { fetchEspecialidades } from "@/features/establishment/academic-period/api/query/use-especialidades"
import { fetchSedeOptions } from "@/features/establishment/academic-period/api/query/use-sede-options"
import { campusKeys } from "@/features/establishment/campuses/api/query-keys"
import { fetchCampusesOptions } from "@/features/establishment/campuses/api/query/use-campuses-options"
import { establishmentKeys } from "@/features/establishment/institution/api/query-keys"
import { fetchDisabilityTypes } from "@/features/establishment/institution/api/query/use-disability-types"
import { fetchEstablishmentsOptions } from "@/features/establishment/institution/api/query/use-establishments-options"
import { fetchEtnias } from "@/features/establishment/institution/api/query/use-etnias"
import { fetchMunicipalities } from "@/features/establishment/institution/api/query/use-municipalities"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"
import { getCatalog } from "@/features/establishment/employees/api/query/use-catalogs"
import { fetchEmployeeRoles } from "@/features/establishment/employees/api/query/use-employee-roles"
import { fetchGradosEscalafon, gradosEscalafonQueryKey } from "@/features/establishment/employees/api/query/use-funcionario-contexto"
import { fetchFuncionarioFicha } from "@/features/establishment/employees/api/query/use-funcionario-ficha"
import { fetchFuncionarios } from "@/features/establishment/employees/api/query/use-funcionarios"
import { fetchPermisosRol, fetchRolesFuncionario } from "@/features/establishment/employees/api/query/use-roles-funcionario"
import { fetchSedeJornadasActivas, sedeJornadasActivasQueryKey } from "@/features/establishment/employees/api/query/use-sede-jornadas"

// ---- Piezas -----------------------------------------------------------------

/** `pageSize` por defecto de todas estas pantallas (search schemas y `useTablePagination`). */
const PAGE_SIZE = 10
/** Todas las páginas, con un tope de seguridad. */
export const MAX_PAGINAS = 200
export const MAX_DETALLES = 2000
/** Con varios colegios o sedes se bajan todos (las pantallas dejan elegir cualquiera); el tope es de seguridad. */
const MAX_SEDES = 2000
const MAX_ESTABLECIMIENTOS = 2000

const OPCIONAL = { optional: true } as const
const grupoMeta = () => offlineMeta(TTL_OFFLINE.grupo)

interface Pagina<R> {
  rows: R[]
  pageCount: number
}

/** Las listas de Entidad territorial llegan como `{ total, filas }`. */
type Listado<R> = Pagina<R> | { total: number; filas: R[] }

const leer = <R>(data: Listado<R>): Pagina<R> =>
  "filas" in data ? { rows: data.filas, pageCount: Math.ceil(data.total / PAGE_SIZE) } : data

interface PaginasInput<R> {
  key: (pageIndex: number) => QueryKey
  fetch: (pageIndex: number) => Promise<Listado<R>>
  detalle?: (row: R) => PrepareTask[]
  meta?: AppQueryMeta
  /** La primera página del listado principal no es opcional; las demás sí. */
  optional?: boolean
}

/** La página 0, las siguientes (hasta `MAX_PAGINAS`) y el detalle de cada fila (hasta `MAX_DETALLES` en total). */
function paginas<R>({ key, fetch, detalle, meta = grupoMeta(), optional }: PaginasInput<R>): PrepareTask {
  let detalles = 0
  const pagina = (pageIndex: number): PrepareTask =>
    seed(key(pageIndex), () => fetch(pageIndex), meta, {
      optional: optional || pageIndex > 0,
      then: (data) => {
        const { rows, pageCount } = leer(data)
        const filas = detalle ? rows.slice(0, Math.max(0, MAX_DETALLES - detalles)) : []
        detalles += filas.length
        return [
          ...(pageIndex === 0
            ? Array.from({ length: Math.max(0, Math.min(pageCount, MAX_PAGINAS) - 1) }, (_, i) => pagina(i + 1))
            : []),
          ...filas.flatMap((row) => detalle?.(row) ?? []),
        ]
      },
    })
  return pagina(0)
}

// ---- Matrícula ----------------------------------------------------------------

/** Catálogos del formulario (de solo lectura) del detalle de matrícula y de la ficha de reserva. */
function catalogosFichaTasks(): PrepareTask[] {
  return [
    ...Object.values(MATRICULA_CATALOG_CATEGORIA).map((categoria) => seedListaValor(categoria, OPCIONAL)),
    seedListaValor("GRADOS", OPCIONAL),
    seed(["catalogs", "municipalities"], fetchMunicipalities, catalogoMeta(), OPCIONAL),
    seed(["catalogs", "etnias"], fetchEtnias, catalogoMeta(), OPCIONAL),
    seed(["catalogs", "disability-types"], fetchDisabilityTypes, catalogoMeta(), OPCIONAL),
    seed(matriculaKeys.campuses(), fetchMatriculaCampuses, proveedorMeta(), OPCIONAL),
    cascadaSedesTask(),
  ]
}

function gradosPeriodoTasks(periodoId: number, jornada: string): PrepareTask[] {
  return [
    seed(academicPeriodKeys.especialidades.byPeriod(periodoId), () => fetchEspecialidades(periodoId), proveedorMeta(), OPCIONAL),
    seed(matriculaKeys.gradosPorPeriodo(periodoId), () => fetchGrados(periodoId), grupoMeta(), {
      ...OPCIONAL,
      then: (grados) =>
        grados.map((grado) =>
          seed(matriculaKeys.gruposPorGrado(grado.id, jornada), () => fetchGrupos(grado.id, jornada), grupoMeta(), OPCIONAL),
        ),
    }),
  ]
}

/** Sede → jornadas → periodos → grados → grupos, y lo que el formulario pide por colegio. */
function cascadaSedesTask(): PrepareTask {
  return seed(academicPeriodKeys.sedeOptions(), fetchSedeOptions, proveedorMeta(), {
    ...OPCIONAL,
    then: (sedes) => [
      ...[...new Set(sedes.map((sede) => sede.fk_establecimiento))].slice(0, MAX_ESTABLECIMIENTOS).flatMap((ee) => {
        // «Digitado en el SIMAT por» (`academic-section.tsx`).
        const simat = { establishmentId: ee, filters: { statuses: ["A" as const] }, sorting: [], pageIndex: 0, pageSize: 500 }
        return [
          seed(matriculaKeys.fieldConfig(ee), () => fetchMatriculaFieldConfig(ee), grupoMeta(), OPCIONAL),
          seed(employeeKeys.lista(simat), () => fetchFuncionarios(simat), grupoMeta(), OPCIONAL),
        ]
      }),
      ...sedes.slice(0, MAX_SEDES).map(({ pk_sede: sede }) =>
        seed(sedeJornadasActivasQueryKey(sede), () => fetchSedeJornadasActivas(sede), grupoMeta(), {
          ...OPCIONAL,
          then: (jornadas) =>
            jornadas.flatMap(({ id, nombre }) => [
              seed(matriculaKeys.periodoResolver(sede, id), () => fetchPeriodoResolverMatricula(sede, id), grupoMeta(), {
                ...OPCIONAL,
                then: (periodoId) => (periodoId == null ? [] : gradosPeriodoTasks(periodoId, nombre)),
              }),
              seed(matriculaKeys.periodosAbiertos(sede, id), () => fetchMatriculaPeriodosAbiertos(sede, id), grupoMeta(), {
                ...OPCIONAL,
                then: (periodos) => periodos.flatMap((periodo) => gradosPeriodoTasks(Number(periodo.value), nombre)),
              }),
            ]),
        }),
      ),
    ],
  })
}

/**
 * La lista se guarda recortada (P6, `matriculaListaMeta`); el detalle de cada
 * fila, completo (decisión del líder: lo que la persona puede ver se guarda).
 */
function matriculaTasks(): PrepareTask[] {
  const params = (pageIndex: number) => ({ ...MATRICULA_LISTA_POR_DEFECTO, pageIndex })
  return [
    paginas({
      key: (p) => matriculaKeys.lista(params(p)),
      fetch: (p) => fetchMatricula(params(p)),
      meta: matriculaListaMeta(),
      detalle: ({ id, snapshotPendiente }) => [
        seed(matriculaKeys.detalle(id), () => fetchMatriculaDetail(id), grupoMeta(), OPCIONAL),
        seed(matriculaKeys.notasHomologadas(id), () => fetchNotasHomologadas(id), grupoMeta(), OPCIONAL),
        ...(snapshotPendiente
          ? [seed(matriculaKeys.snapshotPendiente(id), () => fetchSnapshotPendiente(id), grupoMeta(), OPCIONAL)]
          : []),
      ],
    }),
    seed(matriculaKeys.solicitudesPendientes(), fetchSolicitudesPendientes, grupoMeta(), OPCIONAL),
    // Acciones que el backend le habilita al rol (Cambiar de grado, Reactivar).
    seed(matriculaKeys.capacidades, fetchMatriculaCapacidades, grupoMeta(), OPCIONAL),
    // Configuración de parámetros requeridos: con un solo colegio se pide sin id; con varios, la cascada trae la de cada uno.
    seed(establishmentKeys.options(), fetchEstablishmentsOptions, proveedorMeta(), {
      ...OPCIONAL,
      then: ({ rows }) =>
        rows.length > 1
          ? []
          : [seed(matriculaKeys.fieldConfig(null), () => fetchMatriculaFieldConfig(null), grupoMeta(), OPCIONAL)],
    }),
  ]
}

// ---- Inscripción y reservas ---------------------------------------------------

function reservaDetalleTasks(id: string): PrepareTask[] {
  return [
    seed(reservaKeys.ficha(id), () => fetchReservaFicha(id), grupoMeta(), {
      ...OPCIONAL,
      then: (ficha) => {
        if (ficha.entrante) return []
        const { establecimientoId: ee, fkTperiodoAcademico: periodo, fkTmatriculaGenerada } = ficha.reserva
        const generada = fkTmatriculaGenerada == null ? null : String(fkTmatriculaGenerada)
        return [
          seed(matriculaKeys.fieldConfig(ee), () => fetchMatriculaFieldConfig(ee), grupoMeta(), OPCIONAL),
          ...(periodo == null
            ? []
            : [seed(academicPeriodKeys.especialidades.byPeriod(periodo), () => fetchEspecialidades(periodo), proveedorMeta(), OPCIONAL)]),
          ...(generada == null
            ? []
            : [
                seed(matriculaKeys.asignaturas(generada), () => fetchMatriculaAsignaturas(generada), grupoMeta(), OPCIONAL),
                seed(matriculaKeys.soportes(generada), () => fetchSoportes(generada), grupoMeta(), OPCIONAL),
              ]),
        ]
      },
    }),
  ]
}

function reservasTasks(): PrepareTask[] {
  return [
    seed(reservasCupoKeys.establecimiento, fetchEstablecimientoId, proveedorMeta(), {
      ...OPCIONAL,
      then: (ee) => {
        if (ee == null) return []
        const params = (pageIndex: number) => ({ filters: {}, sorting: [], pageIndex, pageSize: PAGE_SIZE })
        return [
          seed(reservasCupoKeys.catalogos(ee), () => fetchReservasCupoCatalogos(ee), proveedorMeta(), OPCIONAL),
          paginas({
            key: (p) => reservasCupoKeys.lista(ee, params(p)),
            fetch: (p) => fetchReservasCupo(ee, params(p), []),
            detalle: ({ id }) => reservaDetalleTasks(id),
          }),
        ]
      },
    }),
  ]
}

/** La lista exige grupo y grado: se baja la de cada grado de cada grupo (los que ofrecen los selectores). */
function inscripcionesTasks(): PrepareTask[] {
  return [
    seed(inscripcionesKeys.catalogos, fetchCatalogosInscripcion, catalogoMeta(), OPCIONAL),
    // Cascada de Nueva inscripción y Ampliar.
    seed(opcionesCupoKey, fetchOpcionesCupo, proveedorMeta(), OPCIONAL),
    seed(inscripcionesKeys.gruposAdmision, fetchGruposAdmision, proveedorMeta(), {
      ...OPCIONAL,
      then: (grupos) =>
        grupos.flatMap((grupo) =>
          grupo.grados.map((grado) => {
            const params = (pageIndex: number) => ({
              filters: { grado, jornada: undefined, q: undefined, estados: ESTADOS_OPCION_POR_DEFECTO },
              pageIndex,
              pageSize: PAGE_SIZE,
            })
            return paginas({
              key: (p) => inscripcionesKeys.lista(grupo.id, params(p)),
              fetch: (p) => fetchInscripciones(grupo, params(p)),
              optional: true,
              detalle: ({ inscripcionId: id }) => [
                seed(inscripcionesKeys.detalle(id), () => fetchInscripcionDetalle(id), grupoMeta(), OPCIONAL),
              ],
            })
          }),
        ),
    }),
  ]
}

function inscripcionConfiguracionTasks(): PrepareTask[] {
  return [
    seed(configuracionKeys.catalogos, fetchCatalogosConfiguracion, catalogoMeta(), OPCIONAL),
    seed(configuracionKeys.grupos, fetchGruposAdmisionConfig, proveedorMeta(), {
      ...OPCIONAL,
      then: (grupos) =>
        grupos
          .slice(0, MAX_DETALLES)
          .map(({ id }) => seed(configuracionKeys.grupo(id), () => fetchGrupoAdmisionConfig(id), proveedorMeta(), OPCIONAL)),
    }),
    seed(configuracionKeys.periodos, fetchPeriodosConfig, proveedorMeta(), {
      ...OPCIONAL,
      then: (periodos) =>
        periodos
          .slice(0, MAX_DETALLES)
          .map(({ id }) => seed(configuracionKeys.periodo(id), () => fetchPeriodoConfig(id), proveedorMeta(), OPCIONAL)),
    }),
  ]
}

/** Solo los roles territoriales reciben contexto (a los demás, `null`: no se pide nada más). */
function territorialTasks(): PrepareTask[] {
  // `q` vacío y no ausente: así lo arma `useBusquedaTerritorial`.
  const params = (pageIndex: number) => ({ q: "", pageIndex, pageSize: PAGE_SIZE })
  const contador = { pageIndex: 0, pageSize: 1 }
  return [
    seed(territorialKeys.contexto, fetchContextoTerritorial, proveedorMeta(), {
      ...OPCIONAL,
      then: (contexto) =>
        contexto == null
          ? []
          : [
              seed(territorialKeys.proyeccion, fetchProyeccion, grupoMeta(), {
                ...OPCIONAL,
                then: (filas) =>
                  filas
                    .slice(0, MAX_DETALLES)
                    .map(({ id }) => seed(territorialKeys.proyeccionDetalle(id), () => fetchProyeccionDetalle(id), grupoMeta(), OPCIONAL)),
              }),
              seed(territorialKeys.calendarios, fetchCalendariosCobertura, grupoMeta(), OPCIONAL),
              seed(territorialKeys.seguimiento, fetchSeguimiento, grupoMeta(), {
                ...OPCIONAL,
                then: (filas) =>
                  filas
                    .slice(0, MAX_DETALLES)
                    .map(({ establecimientoId: ee }) =>
                      seed(territorialKeys.seguimientoDetalle(ee), () => fetchSeguimientoDetalle(ee), grupoMeta(), OPCIONAL),
                    ),
              }),
              // Número de la pestaña (`territorial-tab.tsx`).
              seed(territorialKeys.redistribucionLista(contador), () => fetchRedistribucion(contador), grupoMeta(), OPCIONAL),
              paginas({
                key: (p) => territorialKeys.redistribucionLista(params(p)),
                fetch: (p) => fetchRedistribucion(params(p)),
                optional: true,
                detalle: ({ id }) => [
                  seed(territorialKeys.redistribucionLista({ id }), () => fetchRedistribucion({ id }), grupoMeta(), OPCIONAL),
                ],
              }),
              paginas({
                key: (p) => territorialKeys.cuposContratadosLista(params(p)),
                fetch: (p) => fetchCuposContratados(params(p)),
                optional: true,
              }),
              seed(territorialKeys.ubicados, fetchUbicados, grupoMeta(), OPCIONAL),
              seed(territorialKeys.orientaciones, fetchOrientaciones, grupoMeta(), OPCIONAL),
              seed(territorialKeys.solicitudesRetiro, fetchSolicitudesRetiro, grupoMeta(), OPCIONAL),
            ],
    }),
  ]
}

// ---- Matrícula complementaria ---------------------------------------------------

function complementariaTasks(): PrepareTask[] {
  const params = (pageIndex: number) => ({ pageIndex, pageSize: PAGE_SIZE })
  const conOrden = (pageIndex: number) => ({ ...params(pageIndex), sorting: [] })
  return [
    // Más de uno = territorial: muestra el selector de establecimiento.
    seed(establecimientosComplementariaKey, fetchEstablecimientosComplementaria, grupoMeta(), OPCIONAL),
    paginas({
      key: (p) => convocatoriaKeys.lista(conOrden(p)),
      fetch: (p) => fetchConvocatorias(conOrden(p)),
      detalle: ({ id, cupos, estado, modo, ejecutadaEl }) => [
        seed(convocatoriaKeys.detalle(id), () => fetchConvocatoria(id), grupoMeta(), OPCIONAL),
        // Mismas condiciones que `accionesDe` (Seleccionar y Ver resultado).
        ...(modo === "MANUAL" && (estado === "EN_SELECCION" || estado === "PUBLICADA")
          ? (cupos ?? []).map((cupo) =>
              seed(convocatoriaKeys.seleccion(id, cupo.id), () => fetchSeleccionCupo(id, cupo.id), grupoMeta(), OPCIONAL),
            )
          : []),
        ...(ejecutadaEl && modo === "AUTOMATICA"
          ? [seed(convocatoriaKeys.resultado(id), () => fetchResultado(id), grupoMeta(), OPCIONAL)]
          : []),
      ],
    }),
    paginas({
      key: (p) => postulacionKeys.lista(params(p)),
      fetch: (p) => fetchPostulaciones(params(p)),
      optional: true,
      detalle: ({ id }) => [seed(postulacionKeys.detalle(id), () => fetchPostulacion(id), grupoMeta(), OPCIONAL)],
    }),
    paginas({
      key: (p) => convenioKeys.lista(params(p)),
      fetch: (p) => fetchConvenios(params(p)),
      optional: true,
    }),
  ]
}

// ---- Promoción y nivelación, actualización de datos -------------------------------

function promocionTasks(): PrepareTask[] {
  const pagina = (pageIndex: number) => ({ pageIndex, pageSize: PAGE_SIZE })
  return [
    seed(promocionKeys.opciones, fetchOpcionesPromocion, proveedorMeta(), OPCIONAL),
    paginas({
      key: (p) => promocionKeys.reprobados(cuerpoReprobados({}, pagina(p))),
      fetch: (p) => fetchReprobados(cuerpoReprobados({}, pagina(p))),
      detalle: ({ matriculaId: id }) => [seed(promocionKeys.areasDelAnio(id), () => fetchAreasDelAnio(id), grupoMeta(), OPCIONAL)],
    }),
    paginas({
      key: (p) => promocionKeys.pendientes(cuerpoPendientes({}, pagina(p))),
      fetch: (p) => fetchPendientes(cuerpoPendientes({}, pagina(p))),
      optional: true,
      detalle: ({ promocionId: id }) => [seed(promocionKeys.detalle(id), () => fetchDetallePromocion(id), grupoMeta(), OPCIONAL)],
    }),
  ]
}

function actualizacionDatosTasks(): PrepareTask[] {
  const cuerpo = (pageIndex: number) => cuerpoSolicitudes({}, { pageIndex, pageSize: PAGE_SIZE })
  return [
    // Pestaña con la que abre la pantalla: la configuración de cada establecimiento que alcanza (territorial: varios).
    seed(actualizacionKeys.establecimientos, fetchEstablecimientosActualizacion, grupoMeta(), {
      then: (ees) =>
        ees.slice(0, MAX_ESTABLECIMIENTOS).map((e) =>
          seed(actualizacionKeys.configuracionDe(e.id), () => fetchConfiguracionActualizacion(e.id), grupoMeta()),
        ),
    }),
    seed(actualizacionKeys.pendientes, fetchPendientesCount, grupoMeta(), OPCIONAL),
    paginas({
      key: (p) => actualizacionKeys.lista(cuerpo(p)),
      fetch: (p) => fetchSolicitudes(cuerpo(p)),
      optional: true,
    }),
  ]
}

// ---- Funcionarios ---------------------------------------------------------------

const CATALOGOS_FUNCIONARIO = [
  CATALOGS.WORK_SCHEDULES,
  CATALOGS.DOCUMENT_TYPES,
  CATALOGS.GENDERS,
  CATALOGS.EMPLOYEE_CLASSES,
  CATALOGS.EDUCATION_LEVELS,
  CATALOGS.HIGHEST_EDUCATION_LEVELS,
  CATALOGS.FUNDING_SOURCES,
  CATALOGS.EMPLOYMENT_TYPES,
] as const

function funcionariosEstablecimiento(establishmentId: number): PrepareTask {
  const params = (pageIndex: number) => ({ establishmentId, filters: {}, sorting: [], pageIndex, pageSize: PAGE_SIZE })
  return paginas({
    key: (p) => employeeKeys.lista(params(p)),
    fetch: (p) => fetchFuncionarios(params(p)),
    detalle: ({ id }) => [
      seed(employeeKeys.ficha(id, establishmentId), () => fetchFuncionarioFicha(id, establishmentId), grupoMeta(), OPCIONAL),
      seed(employeeKeys.roles(id, establishmentId), () => fetchRolesFuncionario(id, establishmentId), grupoMeta(), {
        ...OPCIONAL,
        then: (roles) =>
          roles
            .filter((rol) => rol.canRestrict)
            .map((rol) => seed(employeeKeys.permisosRol(id, rol.id), () => fetchPermisosRol(rol.id), grupoMeta(), OPCIONAL)),
      }),
    ],
  })
}

function funcionariosTasks(): PrepareTask[] {
  const estatutos = selectCategoryQueryOptions("ESTATUTO_DOCENTE")
  return [
    // Sin las opciones la pantalla no sabe de qué establecimiento listar.
    seed(establishmentKeys.options(), fetchEstablishmentsOptions, proveedorMeta(), {
      ...OPCIONAL,
      then: ({ rows }) => rows.slice(0, MAX_ESTABLECIMIENTOS).map(({ id }) => funcionariosEstablecimiento(id)),
    }),
    seed(["catalogs", "employee-roles"], fetchEmployeeRoles, catalogoMeta(), OPCIONAL),
    seed(campusKeys.options(), fetchCampusesOptions, proveedorMeta(), OPCIONAL),
    ...CATALOGOS_FUNCIONARIO.map((catalogo) => seed(["catalogs", catalogo], () => getCatalog(catalogo), catalogoMeta(), OPCIONAL)),
    seed(estatutos.queryKey, estatutos.queryFn, estatutos.meta, {
      ...OPCIONAL,
      then: (filas) =>
        filas.map(({ pk_lista_valor: id }) =>
          seed(gradosEscalafonQueryKey(id), () => fetchGradosEscalafon(id), catalogoMeta(), OPCIONAL),
        ),
    }),
  ]
}

// ---- Informes y reportes ----------------------------------------------------------

/** Consulta de matriculados como abre (sin filtros, sin orden) y los períodos del filtro. */
function informesReportesTasks(): PrepareTask[] {
  const body = (pageIndex: number) => matriculadosBody({} as InformesSearch, { pageIndex, pageSize: PAGE_SIZE, sorting: [] })
  return [
    seed(informesKeys.periodos, fetchPeriodosInforme, proveedorMeta(), OPCIONAL),
    paginas({ key: (p) => informesKeys.matriculados(body(p)), fetch: (p) => fetchMatriculados(body(p)), optional: true }),
  ]
}

// ---- Todo junto -----------------------------------------------------------------

/** El alcance lo pone el menú (y el backend en cada respuesta): `_roles` queda por el contrato común. */
export function coberturaTasks(queryClient: QueryClient, _roles: readonly string[]): PrepareTask[] {
  const matricula = menuIncludes(queryClient, "/app/cobertura/matricula")
  const inscritos = menuIncludes(queryClient, "/app/cobertura/inscritos")
  const tasks: PrepareTask[] = []
  if (matricula || inscritos) tasks.push(...catalogosFichaTasks())
  if (matricula) tasks.push(...matriculaTasks())
  if (inscritos) tasks.push(...reservasTasks(), ...inscripcionesTasks(), ...inscripcionConfiguracionTasks(), ...territorialTasks())
  if (menuIncludes(queryClient, "/app/cobertura/matricula-complementaria")) tasks.push(...complementariaTasks())
  if (menuIncludes(queryClient, "/app/cobertura/promocion-nivelacion")) tasks.push(...promocionTasks())
  if (menuIncludes(queryClient, "/app/cobertura/actualizacion-datos")) tasks.push(...actualizacionDatosTasks())
  if (menuIncludes(queryClient, "/app/cobertura/informes-reportes")) tasks.push(...informesReportesTasks())
  if (menuIncludes(queryClient, "/app/establecimiento-educativo/funcionarios")) tasks.push(...funcionariosTasks())
  return tasks
}
