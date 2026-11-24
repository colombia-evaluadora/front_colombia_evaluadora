// "Preparar" de Administración, Bitácora y Comunicaciones (salvo el chat, que ya está en `prepare-tasks.ts`).
// Cada key es la que arma la pantalla al abrir con valores por defecto. Nunca se siembra una lectura con
// efectos en el backend: el detalle de un comunicado ajeno lo marca leído y la consulta del archivo
// histórico (conservación de datos) queda en la Bitácora.
import type { QueryClient, QueryKey } from "@tanstack/react-query"

import { paths } from "@/config/paths"
import type { PrepareTask } from "@/features/offline/lib/prepare-engine"
import { menuIncludes, seed, seedListaValor } from "@/features/offline/lib/prepare-seed"
import { TTL_OFFLINE, offlineMeta, proveedorMeta } from "@/lib/offline/query-meta"
import { navigationKeys } from "@/features/navigation/api/query-keys"
import type { MenuPermission } from "@/features/navigation/api/types/menu-permission"
// Administración
import { administradorKeys } from "@/features/administration/administradores-territoriales/api/query-keys"
import {
  fetchAdministrador,
  fetchAdministradores,
  fetchCatalogos as fetchCatalogosAdministrador,
} from "@/features/administration/administradores-territoriales/api/query/use-administradores-query"
import { supervisorKeys } from "@/features/administration/supervisores-territoriales/api/query-keys"
import {
  fetchCatalogos as fetchCatalogosSupervisor,
  fetchSupervisor,
  fetchSupervisores,
} from "@/features/administration/supervisores-territoriales/api/query/use-supervisores-query"
import { superadministradorKeys } from "@/features/administration/superadministradores/api/query-keys"
import {
  fetchSuperadministradores,
  fetchTiposDocumento,
} from "@/features/administration/superadministradores/api/query/use-superadministradores-query"
import { areaOficialKeys } from "@/features/administration/areas-oficiales/api/query-keys"
import { fetchAreasOficiales } from "@/features/administration/areas-oficiales/api/query/use-areas-oficiales-query"
import { criterioPrioridadKeys } from "@/features/administration/criterios-prioridad/api/query-keys"
import {
  fetchCriterioCampos,
  fetchCriteriosPrioridad,
} from "@/features/administration/criterios-prioridad/api/query/use-criterios-prioridad-query"
import { festivoKeys } from "@/features/administration/festivos/api/query-keys"
import { fetchFestivos } from "@/features/administration/festivos/api/query/use-festivos-query"
import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"
import { fetchCategorias } from "@/features/administration/listas-valor/api/query/use-categorias-query"
import { fetchIconos } from "@/features/administration/listas-valor/api/query/use-iconos-query"
import { fetchValores } from "@/features/administration/listas-valor/api/query/use-valores-query"
import { parametrosEdadKeys } from "@/features/administration/parametros-edad/api/query-keys"
import { fetchParametros } from "@/features/administration/parametros-edad/api/query/use-parametros-edad-query"
import { relacionesAlumnoGrupoKeys } from "@/features/administration/relaciones-alumno-grupo/api/query-keys"
import { fetchRelaciones } from "@/features/administration/relaciones-alumno-grupo/api/query/use-relaciones-alumno-grupo-query"
import { roleMenuKeys } from "@/features/administration/roles-menus/api/query-keys"
import { fetchMenuCatalog } from "@/features/administration/roles-menus/api/query/use-menu-catalog-query"
import { fetchMenus } from "@/features/administration/roles-menus/api/query/use-menus-query"
import { fetchRoleMenus } from "@/features/administration/roles-menus/api/query/use-role-menus-query"
import { fetchRoles } from "@/features/administration/roles-menus/api/query/use-roles-query"
import { conservacionKeys } from "@/features/administration/conservacion-datos/api/query-keys"
import {
  fetchAmpliaciones,
  fetchConservacionConfig,
  fetchDetalleVencido,
  fetchModulos,
  fetchPolitica,
  fetchPoliticas,
  fetchVencidos,
} from "@/features/administration/conservacion-datos/api/query/use-conservacion-queries"
import { auditKeys } from "@/features/administration/audits/api/query-keys"
import { fetchAuditSessionStatuses } from "@/features/administration/audits/api/query/use-audit-session-statuses-query"
import { fetchAuditTables, type UseAuditTablesQueryParams } from "@/features/administration/audits/api/query/use-audit-tables-query"
import { fetchAudits, type UseAuditsQueryParams } from "@/features/administration/audits/api/query/use-audits-query"
import { fetchAuditsStats } from "@/features/administration/audits/api/query/use-audits-stats-query"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { fetchTeachingLevels } from "@/features/establishment/academic-period/api/query/use-teaching-levels"
import { establishmentKeys } from "@/features/establishment/institution/api/query-keys"
import { fetchEstablishmentsOptions } from "@/features/establishment/institution/api/query/use-establishments-options"
// Bitácora
import { bitacoraKeys } from "@/features/bitacora/api/query-keys"
import { fetchEntidades } from "@/features/bitacora/api/query/use-bitacora-entidades-query"
import { fetchEstado } from "@/features/bitacora/api/query/use-bitacora-estado-query"
import { fetchBitacora, type BitacoraParams } from "@/features/bitacora/api/query/use-bitacora-query"
import { fetchSedes } from "@/features/bitacora/api/query/use-bitacora-sedes-query"
import { BITACORA_MODULO_IDS, BITACORA_MODULO_SLUG, type BitacoraModulo } from "@/features/bitacora/api/types/bitacora"
import { accionPorDefecto, filtrosVacios, recordarDiaPreparado } from "@/features/bitacora/lib/filtros-por-defecto"
// Comunicaciones
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import { fetchComunicado } from "@/features/comunicaciones/chat/api/query/use-comunicado-query"
import {
  cascadaKey,
  CONJUNTO_VACIO,
  fetchCascada,
  toCascadaParams,
} from "@/features/comunicaciones/comunicados/api/comunicado-documento"
import {
  comunicadosGestionListaKey,
  fetchComunicadosGestion,
  fetchSeguimientoComunicado,
  seguimientoComunicadoKey,
  type PestanaComunicados,
} from "@/features/comunicaciones/comunicados/api/comunicados-gestion"
import {
  LISTA_FORMA_PUBLICACION,
  LISTA_POBLACION,
  LISTA_SELECCION_FUNCIONARIOS,
} from "@/features/comunicaciones/comunicados/api/listas-valor"
import {
  fetchComunicadosTerritorial,
  fetchComunicadoTerritorial,
  fetchEstablecimientosTerritorial,
  territorialKeys,
} from "@/features/comunicaciones/territorial/api/comunicados-territorial"
import {
  espaciosKeys,
  fetchChatEspacio,
  fetchEspacio,
  fetchEspacios,
  fetchMateriales,
  fetchParticipantes,
} from "@/features/comunicaciones/espacios/api/query/use-espacios-query"
import { fetchEquipos, fetchTema, fetchTemas } from "@/features/comunicaciones/espacios/api/query/use-foro-equipos-query"
import {
  fetchCursos,
  fetchJornadas,
  fetchMisProcesos,
  fetchParteEleccion,
  fetchProceso,
  fetchProcesos,
  procesosKeys,
  type Funcion,
  type Proceso,
} from "@/features/comunicaciones/procesos/api/procesos"

const MAX_PAGINAS = 20
/** Auditoría y bitácora son enormes: solo lo más reciente. */
const MAX_PAGINAS_AUDITORIA = 5
const MAX_DETALLES = 300
/** Tamaño por defecto de las tablas (`useTablePagination`). */
const PAGE_SIZE = 10
const SUPER_ADMIN = "CEVAL-SUPER_ADMINISTRADOR"

// La misma que `conMetaPorDefecto` le da a una query de estos módulos sin meta propia.
const meta = () => offlineMeta(TTL_OFFLINE.grupo)
const opcional = { optional: true }

interface Paginado<T> {
  key: (pagina: number) => QueryKey
  fetch: (pagina: number) => Promise<T & { pageCount: number }>
  max?: number
  optional?: boolean
  /** Detalle de las filas de cada página. */
  hijos?: (data: T) => PrepareTask[]
}

/** Primera página y, con su `pageCount`, las siguientes hasta el tope. */
function paginado<T>({ key, fetch, max = MAX_PAGINAS, optional, hijos }: Paginado<T>): PrepareTask {
  const pagina = (index: number): PrepareTask =>
    seed(key(index), () => fetch(index), meta(), {
      optional,
      then: (data) => [
        ...(hijos?.(data) ?? []),
        ...(index === 0
          ? Array.from({ length: Math.max(0, Math.min(data.pageCount, max) - 1) }, (_, i) => pagina(i + 1))
          : []),
      ],
    })
  return pagina(0)
}

function puedeCrear(queryClient: QueryClient, codigo: string): boolean {
  const permisos = queryClient.getQueryData<MenuPermission[]>(navigationKeys.permisosMenu)
  return permisos?.find((p) => p.codigo === codigo)?.puede_crear ?? false
}

// ---- Administración -------------------------------------------------------------

function rolesMenusTasks(): PrepareTask[] {
  return [
    seed(roleMenuKeys.roles, fetchRoles, meta(), {
      then: (roles) =>
        roles
          .slice(0, MAX_DETALLES)
          .map((rol) => seed(roleMenuKeys.roleMenus.detalle(rol.id), () => fetchRoleMenus(rol.id), meta(), opcional)),
    }),
    seed(roleMenuKeys.menus.all, fetchMenus, meta()),
    seed(roleMenuKeys.menus.catalogo, fetchMenuCatalog, meta(), opcional),
  ]
}

const valoresTask = (categoria: string) =>
  seed(listaValorKeys.valores(categoria), () => fetchValores(categoria), meta(), opcional)

function listasValorTasks(): PrepareTask[] {
  return [
    seed(listaValorKeys.categorias, fetchCategorias, meta(), {
      then: (categorias) => categorias.slice(0, MAX_DETALLES).map((c) => valoresTask(c.categoria)),
    }),
    seed(listaValorKeys.iconos, fetchIconos, meta(), opcional),
  ]
}

function supervisoresTasks(): PrepareTask[] {
  return [
    seed(supervisorKeys.lista, fetchSupervisores, meta(), {
      then: (filas) =>
        filas
          .slice(0, MAX_DETALLES)
          .map((s) => seed(supervisorKeys.detalle(s.pkSupervisor), () => fetchSupervisor(s.pkSupervisor), meta(), opcional)),
    }),
    seed(supervisorKeys.catalogos, fetchCatalogosSupervisor, meta(), opcional),
  ]
}

function administradoresTasks(): PrepareTask[] {
  return [
    seed(administradorKeys.lista, fetchAdministradores, meta(), {
      then: (filas) =>
        filas
          .slice(0, MAX_DETALLES)
          .map((a) =>
            seed(administradorKeys.detalle(a.pkAdministrador), () => fetchAdministrador(a.pkAdministrador), meta(), opcional),
          ),
    }),
    seed(administradorKeys.catalogos, fetchCatalogosAdministrador, meta(), opcional),
  ]
}

const establecimientosTask = (then?: (primero: number | null) => PrepareTask[]) =>
  seed(establishmentKeys.options(), fetchEstablishmentsOptions, proveedorMeta(), {
    optional: true,
    then: then && ((data) => then(data.rows?.[0]?.id ?? null)),
  })

/** Sin la pestaña Archivo: su POST deja cada consulta en la Bitácora. */
function conservacionTasks(esSuperAdmin: boolean): PrepareTask[] {
  const ampliaciones = (pk: number | null) =>
    seed(conservacionKeys.ampliaciones(pk), () => fetchAmpliaciones(pk), meta(), opcional)
  return [
    seed(conservacionKeys.politicas, fetchPoliticas, meta(), {
      then: (politicas) =>
        politicas
          .slice(0, MAX_DETALLES)
          .map((p) => seed(conservacionKeys.politica(p.pkPolitica), () => fetchPolitica(p.pkPolitica), meta(), opcional)),
    }),
    seed(conservacionKeys.modulos, fetchModulos, meta(), opcional),
    ...(esSuperAdmin
      ? [
          // La pestaña abre en el primer establecimiento.
          establecimientosTask((primero) => (primero == null ? [] : [ampliaciones(primero)])),
          seed(conservacionKeys.config, fetchConservacionConfig, meta(), opcional),
          seed(conservacionKeys.vencidos, fetchVencidos, meta(), {
            optional: true,
            then: (lotes) =>
              lotes
                .slice(0, MAX_DETALLES)
                .map((v) =>
                  seed(
                    conservacionKeys.detalleVencido(v.pkPolitica, v.pkEstablecimiento),
                    () => fetchDetalleVencido(v.pkPolitica, v.pkEstablecimiento),
                    meta(),
                    opcional,
                  ),
                ),
          }),
        ]
      : [ampliaciones(null)]),
  ]
}

// ---- Registro de actividad ------------------------------------------------------

export function auditoriaSesionesParams(pageIndex: number): UseAuditsQueryParams {
  return { filters: {}, sorting: [], pageIndex, pageSize: PAGE_SIZE }
}

export function auditoriaTablasParams(pageIndex: number): UseAuditTablesQueryParams {
  return { filters: {}, sorting: [], pageIndex, pageSize: PAGE_SIZE }
}

function auditoriaSesionesTasks(): PrepareTask[] {
  return [
    paginado({
      key: (p) => auditKeys.sesiones.lista(auditoriaSesionesParams(p)),
      fetch: (p) => fetchAudits(auditoriaSesionesParams(p)),
      max: MAX_PAGINAS_AUDITORIA,
    }),
    seed(auditKeys.sesiones.stats({ filters: {} }), () => fetchAuditsStats({ filters: {} }), meta(), opcional),
    seed(auditKeys.estadosSesion, fetchAuditSessionStatuses, meta(), opcional),
  ]
}

function auditoriaTablasTasks(): PrepareTask[] {
  return [
    paginado({
      key: (p) => auditKeys.tablas.lista(auditoriaTablasParams(p)),
      fetch: (p) => fetchAuditTables(auditoriaTablasParams(p)),
      max: MAX_PAGINAS_AUDITORIA,
    }),
  ]
}

/** Los filtros con que abre el módulo: últimos 30 días y, el Superadministrador, su primer establecimiento. */
export function bitacoraParams(
  modulo: BitacoraModulo,
  esSuperAdmin: boolean,
  establecimiento: string,
  pageIndex: number,
): BitacoraParams {
  return {
    filters: { ...filtrosVacios(), modulo, accion: accionPorDefecto(modulo), establecimiento },
    sorting: [],
    pageIndex,
    pageSize: PAGE_SIZE,
    verSistema: esSuperAdmin,
  }
}

function bitacoraModuloTasks(modulo: BitacoraModulo, esSuperAdmin: boolean, establecimiento: string): PrepareTask[] {
  // Igual que la pantalla: el Superadministrador sin establecimiento no consulta (salvo Administración).
  if (esSuperAdmin && !establecimiento && modulo !== "ADMINISTRACION") return []
  const params = (p: number) => bitacoraParams(modulo, esSuperAdmin, establecimiento, p)
  return [
    paginado({
      key: (p) => bitacoraKeys.lista(params(p)),
      fetch: (p) => fetchBitacora(params(p)),
      max: MAX_PAGINAS_AUDITORIA,
      // El alcance por módulo depende del rol; con el que abre la pantalla alcanza para avisar un error.
      optional: modulo !== "ESTABLECIMIENTO",
      // Una lectura por página (no por fila): los campos legibles que la tabla muestra.
      hijos: (data) => {
        const ids = data.rows.map((e) => e.id)
        return ids.length === 0 ? [] : [seed(bitacoraKeys.estado(ids), () => fetchEstado(ids, establecimiento), meta(), opcional)]
      },
    }),
    seed(bitacoraKeys.entidades(modulo), () => fetchEntidades(modulo), meta(), opcional),
  ]
}

function bitacoraTasks(queryClient: QueryClient, esSuperAdmin: boolean): PrepareTask[] {
  const modulos = BITACORA_MODULO_IDS.filter((m) =>
    menuIncludes(queryClient, paths.app.bitacoraModulo.getHref(BITACORA_MODULO_SLUG[m])),
  )
  if (modulos.length === 0) return []
  recordarDiaPreparado()
  const deModulos = (establecimiento: string) =>
    modulos.flatMap((m) => bitacoraModuloTasks(m, esSuperAdmin, establecimiento))
  return [
    seed(bitacoraKeys.sedes(), fetchSedes, meta(), opcional),
    seedListaValor("JORNADA", opcional),
    ...(esSuperAdmin ? [establecimientosTask((primero) => deModulos(String(primero ?? "")))] : deModulos("")),
  ]
}

// ---- Comunicaciones -------------------------------------------------------------

export const comunicadosFiltros = (pestana: PestanaComunicados, page: number) => ({ pestana, page, pageSize: PAGE_SIZE })

function comunicadosTasks(queryClient: QueryClient): PrepareTask[] {
  const lista = (pestana: PestanaComunicados) =>
    paginado({
      key: (p) => comunicadosGestionListaKey(comunicadosFiltros(pestana, p)),
      fetch: (p) => fetchComunicadosGestion(comunicadosFiltros(pestana, p)),
      // El GET del detalle marca leído a quien no lo creó (la marca es de una sola vez): solo los propios
      // y los que la persona ya leyó.
      hijos: ({ items }) =>
        items
          .filter((c) => c.esAutor === true || c.leido === true)
          .flatMap((c) => [
            seed(chatKeys.comunicado(c.id), () => fetchComunicado(c.id), offlineMeta(TTL_OFFLINE.detalle), opcional),
            ...(c.esAutor
              ? [seed(seguimientoComunicadoKey(c.id), () => fetchSeguimientoComunicado(c.id), meta(), opcional)]
              : []),
          ]),
    })
  const cascada = toCascadaParams(CONJUNTO_VACIO)
  return [
    lista("RECIBIDOS"),
    lista("ANTERIORES"),
    ...(puedeCrear(queryClient, "COMUNICADOS")
      ? [
          lista("PUBLICADOS"),
          seed(cascadaKey(cascada), () => fetchCascada(cascada), meta(), opcional),
          seedListaValor(LISTA_POBLACION, opcional),
          seedListaValor(LISTA_SELECCION_FUNCIONARIOS, opcional),
          seedListaValor(LISTA_FORMA_PUBLICACION, opcional),
        ]
      : []),
  ]
}

function territorialTasks(): PrepareTask[] {
  return [
    paginado({
      key: (p) => territorialKeys.lista({}, p, PAGE_SIZE),
      fetch: (p) => fetchComunicadosTerritorial({}, { pagina: p, tamano: PAGE_SIZE }),
      hijos: ({ rows }) =>
        rows.map((c) => seed(territorialKeys.detalle(c.id), () => fetchComunicadoTerritorial(c.id), meta(), opcional)),
    }),
    seed(territorialKeys.establecimientos, fetchEstablecimientosTerritorial, meta(), opcional),
  ]
}

function conversacionEspacioTasks(id: number, equipo: number | null, chat: boolean, foro: boolean): PrepareTask[] {
  return [
    ...(chat ? [seed(espaciosKeys.chat(id, equipo), () => fetchChatEspacio(id, equipo), meta(), opcional)] : []),
    ...(foro
      ? [
          seed(espaciosKeys.temas(id, equipo), () => fetchTemas(id, equipo), meta(), {
            optional: true,
            then: (temas) =>
              temas
                .slice(0, MAX_DETALLES)
                .map((t) => seed(espaciosKeys.tema(id, t.id), () => fetchTema(id, t.id), meta(), opcional)),
          }),
        ]
      : []),
  ]
}

function espacioTasks(id: number): PrepareTask[] {
  return [
    seed(espaciosKeys.detalle(id), () => fetchEspacio(id), meta(), {
      optional: true,
      then: (detalle) => {
        if (!detalle) return []
        // Igual que la pantalla: también las herramientas deshabilitadas con historial.
        const visible = (h: (typeof detalle.herramientas)[number]) =>
          detalle.herramientas.includes(h) || detalle.conContenido.includes(h)
        return [
          ...conversacionEspacioTasks(id, null, visible("CHAT"), visible("FORO")),
          ...(visible("EQUIPOS")
            ? [
                seed(espaciosKeys.equipos(id), () => fetchEquipos(id), meta(), {
                  optional: true,
                  // Un equipo abierto muestra su chat y sus temas sin mirar las herramientas.
                  then: (equipos) =>
                    equipos.slice(0, MAX_DETALLES).flatMap((q) => conversacionEspacioTasks(id, q.id, true, true)),
                }),
              ]
            : []),
          ...(detalle.puedeEscribir || detalle.puedeAdministrar
            ? [seed(espaciosKeys.participantes(id, null), () => fetchParticipantes(id, null), meta(), opcional)]
            : []),
        ]
      },
    }),
    seed(espaciosKeys.materiales(id), () => fetchMateriales(id), meta(), opcional),
  ]
}

function espaciosTasks(): PrepareTask[] {
  return [
    seed(espaciosKeys.lista(), fetchEspacios, meta(), {
      then: (espacios) => espacios.slice(0, MAX_DETALLES).flatMap((e) => espacioTasks(e.id)),
    }),
  ]
}

/** Pestañas de cada elección que la persona ve según sus funciones en el proceso. */
export function partesEleccion(proceso: Pick<Proceso, "misFunciones">, metodo: string): string[] {
  const tiene = (...funciones: Funcion[]) => funciones.some((f) => proceso.misFunciones.includes(f))
  return [
    "candidaturas",
    ...(tiene("ADMINISTRADOR", "REVISOR") ? ["postulaciones"] : []),
    ...(metodo === "VOTACION" && tiene("ADMINISTRADOR", "ESCRUTINIO") ? ["padron"] : []),
    "actas",
    "reclamaciones",
    "designaciones",
  ]
}

const procesoTask = (id: number) =>
  seed(procesosKeys.detalle(id), () => fetchProceso(id), meta(), {
    optional: true,
    then: (proceso) =>
      (proceso?.elecciones ?? []).flatMap((e) =>
        partesEleccion(proceso, e.metodo).map((parte) =>
          seed(procesosKeys.eleccion(e.id, parte), () => fetchParteEleccion<unknown>(e.id, parte), meta(), opcional),
        ),
      ),
  })

function procesosTasks(queryClient: QueryClient): PrepareTask[] {
  return [
    // Es la pestaña por defecto.
    seed(procesosKeys.mios(), fetchMisProcesos, meta(), {
      then: (mios) => [...new Set(mios.map((m) => m.proceso))].slice(0, MAX_DETALLES).map(procesoTask),
    }),
    seed(procesosKeys.lista(), fetchProcesos, meta(), {
      then: (filas) => filas.slice(0, MAX_DETALLES).map((p) => procesoTask(p.id)),
    }),
    ...(puedeCrear(queryClient, "PROCESOS_CREAR")
      ? [
          seed(procesosKeys.cursos(), fetchCursos, meta(), opcional),
          seed(procesosKeys.jornadas(), fetchJornadas, meta(), opcional),
        ]
      : []),
  ]
}

// ---- Todo junto -----------------------------------------------------------------

export function administracionTasks(queryClient: QueryClient, roles: readonly string[]): PrepareTask[] {
  const esSuperAdmin = roles.includes(SUPER_ADMIN)
  const si = (ruta: string, tareas: () => PrepareTask[]) => (menuIncludes(queryClient, ruta) ? tareas() : [])
  const app = paths.app
  return [
    ...si(app.rolesMenus.getHref(), rolesMenusTasks),
    ...si(app.listasValor.getHref(), listasValorTasks),
    ...si(app.areasOficiales.getHref(), () => [
      seed(areaOficialKeys.lista, fetchAreasOficiales, meta()),
      seed(academicPeriodKeys.teachingLevels(), fetchTeachingLevels, proveedorMeta(), opcional),
    ]),
    ...si(app.superadministradores.getHref(), () => [
      seed(superadministradorKeys.lista, fetchSuperadministradores, meta()),
      seed(superadministradorKeys.tiposDocumento, fetchTiposDocumento, meta(), opcional),
    ]),
    ...si(app.supervisoresTerritoriales.getHref(), supervisoresTasks),
    ...si(app.administradoresTerritoriales.getHref(), administradoresTasks),
    ...si(app.criteriosPrioridad.getHref(), () => [
      seed(criterioPrioridadKeys.lista, fetchCriteriosPrioridad, meta()),
      seed(criterioPrioridadKeys.campos, fetchCriterioCampos, meta(), opcional),
    ]),
    ...si(app.parametrosEdad.getHref(), () => [
      seed(parametrosEdadKeys.all, fetchParametros, meta()),
      valoresTask("GRADOS"),
      valoresTask("CALENDARIO"),
    ]),
    ...si(app.relacionesAlumnoGrupo.getHref(), () => [seed(relacionesAlumnoGrupoKeys.all, fetchRelaciones, meta())]),
    ...si(app.festivos.getHref(), () => [seed(festivoKeys.lista, fetchFestivos, meta())]),
    ...si(app.conservacionDatos.getHref(), () => conservacionTasks(esSuperAdmin)),
    ...si(app.auditoriaSesiones.getHref(), auditoriaSesionesTasks),
    ...si(app.auditoriaTablas.getHref(), auditoriaTablasTasks),
    ...bitacoraTasks(queryClient, esSuperAdmin),
    ...si(app.comunicacionesComunicados.getHref(), () => comunicadosTasks(queryClient)),
    ...si(app.comunicacionesComunicadosTerritorial.getHref(), territorialTasks),
    ...si(app.comunicacionesEspacios.getHref(), espaciosTasks),
    ...si(app.comunicacionesProcesos.getHref(), () => procesosTasks(queryClient)),
  ]
}
