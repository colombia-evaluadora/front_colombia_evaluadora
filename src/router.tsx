import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  lazyRouteComponent,
  Outlet,
} from "@tanstack/react-router"
import type { QueryClient } from "@tanstack/react-query"

import { paths } from "@/config/paths"
import { humanizeSlug } from "@/config/breadcrumbs"
import { hasSession } from "@/lib/auth"
import { NetworkSessionError } from "@/lib/network-error"
import { queryClient } from "@/lib/query-client"
import { NotFoundPage } from "@/components/layout/not-found-page"
import { ErrorPage } from "@/components/layout/error-page"
import { PageLoading } from "@/components/layout/page-loading"
import {
  activateSearchSchema,
  checkEmailSearchSchema,
  loginSearchSchema,
  restorePasswordSearchSchema,
} from "@/features/auth/api/schema"
import {
  preMatriculaSearchSchema,
  matriculaSearchSchema,
} from "@/features/coverage/shared/api/schema"
import { inscripcionReservasSearchSchema } from "@/features/coverage/inscripcion-reservas/api/schema"
import {
  auditsSearchSchema,
  auditTablesSearchSchema,
  sessionOperationsSearchSchema,
  tableOperationsSearchSchema,
} from "@/features/administration/audits/api/schema"
import { academicPeriodsSearchSchema, gradeSearchSchema } from "@/features/establishment/academic-period/api/schema"
import {
  planeadorActividadCrearSearchSchema,
  planeadorRecursoPreviewSearchSchema,
  planeadorSearchSchema,
  planeadorUnidadCrearSearchSchema,
  planeadorUnidadEditarSearchSchema,
  planeadorUnidadesSearchSchema,
} from "@/features/planeador/api/schema"
import { establishmentsSearchSchema } from "@/features/establishment/institution/api/schema"
import { campusesSearchSchema } from "@/features/establishment/campuses/api/schema"
import { employeeFormSearchSchema, employeesSearchSchema } from "@/features/establishment/employees/api/schema"
import { curricularReferencesSearchSchema } from "@/features/academic-management/curricular-references/api/schema"
import {
  informesSearchSchema,
  planillaInformeSearchSchema,
} from "@/features/academic-management/reports/api/schema"
import {
  asistenciaManualSearchSchema,
  asistenciaSearchSchema,
} from "@/features/academic-management/asistencia/api/schema"
import { listasValorSearchSchema } from "@/features/administration/listas-valor/api/schema"
import { catalogoSearchSchema } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/schema"
import { comitePeriodoSearchSchema, convivenciaSearchSchema } from "@/features/gestion-estudiantil/convivencia/api/schema"
import { citacionesSearchSchema, origenDeSearch, origenSearchSchema } from "@/features/gestion-estudiantil/citaciones/api/schema"
import { observadorSearchSchema } from "@/features/gestion-estudiantil/observador/api/schema"
import { areasOficialesSearchSchema } from "@/features/administration/areas-oficiales/api/schema"
import { festivosSearchSchema } from "@/features/administration/festivos/api/schema"
import { conservacionSearchSchema } from "@/features/administration/conservacion-datos/api/schema"
import { bitacoraSearchSchema } from "@/features/bitacora/api/schema"
import { criteriosPrioridadSearchSchema } from "@/features/administration/criterios-prioridad/api/schema"
import { superadministradoresSearchSchema } from "@/features/administration/superadministradores/api/schema"
import { administradoresSearchSchema } from "@/features/administration/administradores-territoriales/api/schema"
import { supervisoresSearchSchema } from "@/features/administration/supervisores-territoriales/api/schema"
import { chatSearchSchema } from "@/features/comunicaciones/chat/api/schema"
import { comunicadosSearchSchema } from "@/features/comunicaciones/comunicados/api/schema"
import { notificacionesSearchSchema } from "@/features/notificaciones/api/schema"
import { pendientesSearchSchema } from "@/features/offline/schema"
import { NoticeProvider } from "@/components/notice/notice-context"
import {
  getLandingNavUrl,
  navItemsQueryOptions,
} from "@/features/navigation/api/query/use-nav-items-query"
import { connectivityStore } from "@/lib/offline/connectivity"
import { debeElegirPerfil } from "@/features/navigation/lib/perfil"
import { tokenSearchSchema } from "@/features/cuenta/api/cambio-correo"
import { menuPermissionsQueryOptions } from "@/features/navigation/api/query/use-menu-permissions-query"
import { sinAccesoSearchSchema } from "@/features/navigation/api/schema"
import {
  canAccessPath,
  getMenuUrls,
  isAlwaysAllowedPath,
} from "@/features/navigation/lib/route-access"

const LoginPage = lazyRouteComponent(() => import("@/features/auth/pages/login-page"), "LoginPage")
const ForgotPasswordPage = lazyRouteComponent(
  () => import("@/features/auth/pages/forgot-password-page"),
  "ForgotPasswordPage",
)
const ForgotUsernamePage = lazyRouteComponent(
  () => import("@/features/auth/pages/forgot-username-page"),
  "ForgotUsernamePage",
)
const CheckEmailPage = lazyRouteComponent(
  () => import("@/features/auth/pages/check-email-page"),
  "CheckEmailPage",
)
const RestorePasswordPage = lazyRouteComponent(
  () => import("@/features/auth/pages/restore-password-page"),
  "RestorePasswordPage",
)
const ActivatePage = lazyRouteComponent(
  () => import("@/features/auth/pages/activate-page"),
  "ActivatePage",
)
const AuthLayout = lazyRouteComponent(() => import("@/components/layout/auth-layout"), "AuthLayout")
const PublicLayout = lazyRouteComponent(() => import("@/components/public/public-layout"), "PublicLayout")
// Mismo valor que exporta public-layout; aquí sin importar el módulo para no romper el lazy.
const PUBLIC_SITE_NAME = "Control Escolar"
const ProtectedLayout = lazyRouteComponent(
  () => import("@/components/layout/protected-layout"),
  "ProtectedLayout",
)
const SinAccesoPage = lazyRouteComponent(
  () => import("@/features/navigation/pages/sin-acceso-page"),
  "SinAccesoPage",
)
const AuditSessionPage = lazyRouteComponent(
  () => import("@/features/administration/audits/pages/audit-session-page"),
  "AuditSessionPage",
)
const AuditTablesPage = lazyRouteComponent(
  () => import("@/features/administration/audits/pages/audit-tables-page"),
  "AuditTablesPage",
)
const TableOperationsPage = lazyRouteComponent(
  () => import("@/features/administration/audits/pages/table-operations-page"),
  "TableOperationsPage",
)
const InscripcionReservasPage = lazyRouteComponent(
  () => import("@/features/coverage/inscripcion-reservas/pages/inscripcion-reservas-page"),
  "InscripcionReservasPage",
)
const SessionOperationsPage = lazyRouteComponent(
  () => import("@/features/administration/audits/pages/session-operations-page"),
  "SessionOperationsPage",
)
const AcademicPeriodsPage = lazyRouteComponent(
  () => import("@/features/establishment/academic-period/pages/academic-periods-page"),
  "AcademicPeriodsPage"
)
const AcademicPeriodConfigPage = lazyRouteComponent(
  () => import("@/features/establishment/academic-period/pages/academic-period-config-page"),
  "AcademicPeriodConfigPage"
)
const AcademicPeriodViewPage = lazyRouteComponent(
  () => import("@/features/establishment/academic-period/pages/academic-period-config-page"),
  "AcademicPeriodViewPage"
)
const GradePage = lazyRouteComponent(
  () => import("@/features/establishment/academic-period/pages/grade-page"),
  "GradePage"
)
const EstablishmentsPage = lazyRouteComponent(
  () => import("@/features/establishment/institution/pages/establishments-page"),
  "EstablishmentsPage"
)

const CampusesPage = lazyRouteComponent(
  () => import("@/features/establishment/campuses/pages/campuses-page"),
  "CampusesPage"
)
const CampusFormPage = lazyRouteComponent(
  () => import("@/features/establishment/campuses/pages/campus-form-page"),
  "CampusFormPage"
)

const EmployeesPage = lazyRouteComponent(
  () => import("@/features/establishment/employees/pages/employees-page"),
  "EmployeesPage"
)
const EmployeeFormPage = lazyRouteComponent(
  () => import("@/features/establishment/employees/pages/employee-form-page"),
  "EmployeeFormPage"
)
const EmployeeRolesPage = lazyRouteComponent(
  () => import("@/features/establishment/employees/pages/employee-roles-page"),
  "EmployeeRolesPage"
)
const EmployeeRolePermissionsPage = lazyRouteComponent(
  () => import("@/features/establishment/employees/pages/employee-role-permissions-page"),
  "EmployeeRolePermissionsPage"
)

const RolesMenusPage = lazyRouteComponent(
  () => import("@/features/administration/roles-menus/pages/roles-menus-page"),
  "RolesMenusPage"
)

const ListasValorPage = lazyRouteComponent(
  () => import("@/features/administration/listas-valor/pages/listas-valor-page"),
  "ListasValorPage"
)
const AreasOficialesPage = lazyRouteComponent(
  () => import("@/features/administration/areas-oficiales/pages/areas-oficiales-page"),
  "AreasOficialesPage"
)
const BitacoraPage = lazyRouteComponent(
  () => import("@/features/bitacora/pages/bitacora-page"),
  "BitacoraPage"
)
const SuperadministradoresPage = lazyRouteComponent(
  () => import("@/features/administration/superadministradores/pages/superadministradores-page"),
  "SuperadministradoresPage"
)
const SupervisoresTerritorialesPage = lazyRouteComponent(
  () => import("@/features/administration/supervisores-territoriales/pages/supervisores-territoriales-page"),
  "SupervisoresTerritorialesPage"
)
const SupervisorNuevoPage = lazyRouteComponent(
  () => import("@/features/administration/supervisores-territoriales/pages/supervisor-form-page"),
  "SupervisorNuevoPage"
)
const SupervisorModificarPage = lazyRouteComponent(
  () => import("@/features/administration/supervisores-territoriales/pages/supervisor-form-page"),
  "SupervisorModificarPage"
)
const SupervisorDetallePage = lazyRouteComponent(
  () => import("@/features/administration/supervisores-territoriales/pages/supervisor-form-page"),
  "SupervisorDetallePage"
)
const AdministradoresTerritorialesPage = lazyRouteComponent(
  () => import("@/features/administration/administradores-territoriales/pages/administradores-territoriales-page"),
  "AdministradoresTerritorialesPage"
)
const AdministradorNuevoPage = lazyRouteComponent(
  () => import("@/features/administration/administradores-territoriales/pages/administrador-form-page"),
  "AdministradorNuevoPage"
)
const AdministradorModificarPage = lazyRouteComponent(
  () => import("@/features/administration/administradores-territoriales/pages/administrador-form-page"),
  "AdministradorModificarPage"
)
const AdministradorDetallePage = lazyRouteComponent(
  () => import("@/features/administration/administradores-territoriales/pages/administrador-form-page"),
  "AdministradorDetallePage"
)
const CriteriosPrioridadPage = lazyRouteComponent(
  () => import("@/features/administration/criterios-prioridad/pages/criterios-prioridad-page"),
  "CriteriosPrioridadPage"
)
const CriterioNuevoPage = lazyRouteComponent(
  () => import("@/features/administration/criterios-prioridad/pages/criterio-form-page"),
  "CriterioNuevoPage"
)
const CriterioModificarPage = lazyRouteComponent(
  () => import("@/features/administration/criterios-prioridad/pages/criterio-form-page"),
  "CriterioModificarPage"
)
const CriterioDetallePage = lazyRouteComponent(
  () => import("@/features/administration/criterios-prioridad/pages/criterio-form-page"),
  "CriterioDetallePage"
)
const ParametrosEdadPage = lazyRouteComponent(
  () => import("@/features/administration/parametros-edad/pages/parametros-edad-page"),
  "ParametrosEdadPage"
)
const RelacionesAlumnoGrupoPage = lazyRouteComponent(
  () => import("@/features/administration/relaciones-alumno-grupo/pages/relaciones-alumno-grupo-page"),
  "RelacionesAlumnoGrupoPage"
)
const FestivosPage = lazyRouteComponent(
  () => import("@/features/administration/festivos/pages/festivos-page"),
  "FestivosPage"
)

const ConservacionDatosPage = lazyRouteComponent(
  () => import("@/features/administration/conservacion-datos/pages/conservacion-datos-page"),
  "ConservacionDatosPage"
)

const PoliticaFormPage = lazyRouteComponent(
  () => import("@/features/administration/conservacion-datos/pages/politica-form-page"),
  "PoliticaFormPage"
)

const EstablishmentDetailPage = lazyRouteComponent(
  () => import("@/features/establishment/institution/pages/establishment-detail-page"),
  "EstablishmentDetailPage"
)
const AddEstablishmentPage = lazyRouteComponent(
  () => import("@/features/establishment/institution/pages/add-establishment-page"),
  "AddEstablishmentPage"
)

const PlaneadorPage = lazyRouteComponent(
  () => import("@/features/planeador/pages/planeador-page"),
  "PlaneadorPage"
)
const PlaneadorEditarActividadPage = lazyRouteComponent(
  () => import("@/features/planeador/pages/planeador-editar-actividad-page"),
  "PlaneadorEditarActividadPage"
)
const PlaneadorCrearActividadPage = lazyRouteComponent(
  () => import("@/features/planeador/pages/planeador-crear-actividad-page"),
  "PlaneadorCrearActividadPage"
)
const PlaneadorUnidadesPage = lazyRouteComponent(
  () => import("@/features/planeador/pages/planeador-unidades-page"),
  "PlaneadorUnidadesPage"
)
const PlaneadorCrearUnidadPage = lazyRouteComponent(
  () => import("@/features/planeador/pages/planeador-crear-unidad-page"),
  "PlaneadorCrearUnidadPage"
)
const PlaneadorEditarUnidadPage = lazyRouteComponent(
  () => import("@/features/planeador/pages/planeador-editar-unidad-page"),
  "PlaneadorEditarUnidadPage"
)
const PlaneadorRecursoPreviewPage = lazyRouteComponent(
  () => import("@/features/planeador/pages/planeador-recurso-preview-page"),
  "PlaneadorRecursoPreviewPage"
)
const PlaneadorPlanillaPage = lazyRouteComponent(
  () => import("@/features/planeador/pages/planeador-planilla-page"),
  "PlaneadorPlanillaPage"
)

const MatriculaPage = lazyRouteComponent(
  () => import("@/features/coverage/matricula/pages/matricula-page"),
  "MatriculaPage",
)

const AddMatriculaPage = lazyRouteComponent(
  () => import("@/features/coverage/matricula/pages/add-matricula-page"),
  "AddMatriculaPage",
)

const MatriculaDetailPage = lazyRouteComponent(
  () => import("@/features/coverage/matricula/pages/matricula-detail-page"),
  "MatriculaDetailPage",
)

const MatriculaEditPage = lazyRouteComponent(
  () => import("@/features/coverage/matricula/pages/matricula-edit-page"),
  "MatriculaEditPage",
)

const MatriculaFieldConfigPage = lazyRouteComponent(
  () => import("@/features/coverage/matricula/pages/matricula-field-config-page"),
  "MatriculaFieldConfigPage",
)

interface RouterContext {
  queryClient: QueryClient
}

const APP_NAME = "Colombia Evaluadora"

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  head: () => ({
    meta: [{ title: APP_NAME }],
  }),
})

// Sitio público (Guía UX §22): cabecera del sitio, sin menú de la app.
const publicLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_publico",
  component: PublicLayout,
})

const publicHead = (title: string, index = false) => () => ({
  meta: [
    { title: `${title} · ${PUBLIC_SITE_NAME}` },
    ...(index ? [] : [{ name: "robots", content: "noindex, nofollow" }]),
  ],
})

// U.1.INI.1: se ve igual con o sin sesión; no muestra datos de personas (Regla 31).
const homeRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: paths.home.path,
  head: publicHead("Inicio", true),
  component: lazyRouteComponent(() => import("@/features/publico/pages/inicio-page"), "InicioPage"),
})

const verificarRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: paths.publico.verificar.path,
  head: publicHead("Verificar un documento"),
  component: lazyRouteComponent(() => import("@/features/publico/pages/verificar-page"), "VerificarPage"),
})

const inscribirRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: paths.publico.inscribir.path,
  head: publicHead("Inscribir"),
  component: lazyRouteComponent(() => import("@/features/publico/pages/proximamente-page"), "InscribirProximamentePage"),
})

const consultarInscripcionRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: paths.publico.consultarInscripcion.path,
  head: publicHead("Consultar inscripción"),
  component: lazyRouteComponent(() => import("@/features/publico/pages/proximamente-page"), "ConsultarProximamentePage"),
})

// U.6.COR: enlaces de los correos de cambio de correo (sin sesión).
export const confirmarCorreoRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: paths.publico.confirmarCorreo.path,
  validateSearch: tokenSearchSchema,
  head: publicHead("Confirmar correo"),
  component: lazyRouteComponent(() => import("@/features/cuenta/pages/cambio-correo-pages"), "ConfirmarCorreoPage"),
})

export const noFuiYoRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: paths.publico.noFuiYo.path,
  validateSearch: tokenSearchSchema,
  head: publicHead("No fui yo"),
  component: lazyRouteComponent(() => import("@/features/cuenta/pages/cambio-correo-pages"), "NoFuiYoPage"),
})

// Pública (QR del boletín, U.4): sin sesión, dentro del marco del sitio público.
export const verificarBoletinRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: paths.verificarBoletin.path,
  head: () => ({
    meta: [
      { title: `Verificación de boletín · ${APP_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: lazyRouteComponent(
    () => import("@/features/verificacion/pages/verificar-boletin-page"),
    "VerificarBoletinPage",
  ),
})

const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_auth",
  component: AuthLayout,
})

const loginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: paths.auth.login.path,
  validateSearch: loginSearchSchema,
  head: () => ({
    meta: [
      { title: `Iniciar sesión · ${APP_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ context, search }) => {
    // Sin red no se sabe si hay sesión: se muestra el login.
    const loggedIn = await hasSession(context.queryClient).catch((error) => {
      if (error instanceof NetworkSessionError) return false
      throw error
    })
    if (loggedIn) {
      throw redirect({ to: search.redirectTo || paths.app.root.getHref() })
    }
  },
  component: LoginPage,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: paths.auth.forgotPassword.path,
  head: () => ({
    meta: [
      { title: `Recuperar contraseña · ${APP_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ForgotPasswordPage,
})

// U.5.DOS: segundo paso del login. Sin sesión: el desafío vive en sessionStorage.
const verificacionRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: paths.auth.verificacion.path,
  head: () => ({ meta: [{ title: `Verificación en dos pasos · ${APP_NAME}` }, { name: "robots", content: "noindex, nofollow" }] }),
  component: lazyRouteComponent(() => import("@/features/auth/pages/segundo-factor-pages"), "VerificacionPage"),
})

const configurarVerificacionRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: paths.auth.configurarVerificacion.path,
  head: () => ({ meta: [{ title: `Configurar verificación · ${APP_NAME}` }, { name: "robots", content: "noindex, nofollow" }] }),
  component: lazyRouteComponent(() => import("@/features/auth/pages/segundo-factor-pages"), "ConfigurarVerificacionPage"),
})

// U.5.PER.1: una cuenta con varios perfiles elige con cuál entra. Requiere sesión.
export const elegirPerfilRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: paths.auth.elegirPerfil.path,
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ context, location }) => {
    if (!(await hasSession(context.queryClient))) {
      throw redirect({ to: paths.auth.login.path, search: { redirectTo: location.href } })
    }
  },
  head: () => ({
    meta: [
      { title: `Elegir perfil · ${APP_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: lazyRouteComponent(() => import("@/features/navigation/pages/elegir-perfil-page"), "ElegirPerfilPage"),
})

const forgotUsernameRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: paths.auth.forgotUsername.path,
  head: () => ({
    meta: [
      { title: `Recuperar correo · ${APP_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ForgotUsernamePage,
})

const checkEmailRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: paths.auth.checkEmail.path,
  validateSearch: checkEmailSearchSchema,
  head: () => ({
    meta: [
      { title: `Revisa tu correo · ${APP_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CheckEmailPage,
})

const restorePasswordRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: paths.auth.restorePassword.path,
  validateSearch: restorePasswordSearchSchema,
  head: () => ({
    meta: [
      { title: `Restablecer contraseña · ${APP_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RestorePasswordPage,
})

const activateRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: paths.auth.activate.path,
  validateSearch: activateSearchSchema,
  head: () => ({
    meta: [
      { title: `Activa tu cuenta · ${APP_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ActivatePage,
})

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: paths.app.root.path,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  // Dos guards en cada navegación: sesión (si no, al login) y menú (la ruta
  // debe ser de un ítem del menú del usuario; si no, a `/app/sin-acceso`).
  // Falla cerrado: una ruta sin mapear queda bloqueada. Sin bypass de superadmin.
  beforeLoad: async ({ context, location, matches }) => {
    // Solo un 401/403 del refresh manda al login; un error de red va al ErrorPage.
    if (!(await hasSession(context.queryClient))) {
      throw redirect({
        to: paths.auth.login.path,
        search: { redirectTo: location.href },
      })
    }

    // Varios perfiles y ninguno elegido en esta sesión: primero se elige (U.5.PER.1).
    if (debeElegirPerfil()) {
      throw redirect({ to: paths.auth.elegirPerfil.path, search: { redirectTo: location.href } })
    }

    // Permisos por pantalla en segundo plano (no bloquea la navegación): así
    // quedan en el snapshot de la sesión aunque la pantalla de aterrizaje no
    // los use, y sin red los botones no quedan todos denegados.
    if (connectivityStore.getState().status !== "offline") {
      void context.queryClient.prefetchQuery(menuPermissionsQueryOptions)
    }

    // Una URL que no existe es un 404, no un "sin acceso".
    if (matches.some((match) => match.globalNotFound)) return
    if (isAlwaysAllowedPath(location.pathname)) return

    // Si el menú no carga, el error va al ErrorPage: nunca se da acceso a ciegas.
    const items = await context.queryClient.ensureQueryData(navItemsQueryOptions)
    if (!canAccessPath(location.pathname, getMenuUrls(items))) {
      throw redirect({
        to: paths.app.sinAcceso.getHref(),
        search: { desde: location.pathname },
      })
    }
  },
  component: ProtectedLayout,
})

// Agrupadores sin página propia: la miga enlaza a su primer hijo.
const COBERTURA_CRUMB = {
  label: "Cobertura",
  to: paths.app.coberturaInscritos.getHref(),
}
const ADMINISTRACION_CRUMB = {
  label: "Administración",
  to: paths.app.auditoriaSesiones.getHref(),
}
const REGISTRO_ACTIVIDAD_CRUMB = {
  label: "Registro de actividad",
  to: paths.app.auditoriaSesiones.getHref(),
}
const ESTABLECIMIENTO_CRUMB = {
  label: "Establecimiento educativo",
  to: paths.app.establishments.general.getHref(),
}
const CONVIVENCIA_CRUMB = { label: "Convivencia", to: paths.app.convivencia.getHref() }
const PERIODOS_CRUMB = {
  label: "Periodos académicos",
  to: paths.app.periodosAcademicos.getHref(),
}
const GESTION_ESTUDIANTIL_CRUMB = {
  label: "Gestión Estudiantil",
  to: paths.app.observador.getHref(),
}
const GESTION_ACADEMICA_CRUMB = {
  label: "Gestión académica",
  to: paths.app.planeadorActividades.getHref(),
}

// `/app` manda al primer ítem del menú del usuario; sin menú, a "sin acceso".
const appIndexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/",
  beforeLoad: async ({ context }) => {
    const offline = connectivityStore.getState().status === "offline"
    // Sin red y sin menú guardado (equipo compartido o nunca se cargó) el
    // `ensureQueryData` falla: se cae al planeador, que funciona sin conexión.
    const items = await context.queryClient.ensureQueryData(navItemsQueryOptions).catch((error: unknown) => {
      if (offline) return []
      throw error
    })
    const fallback = paths.app.planeadorActividades.getHref()
    throw redirect({ to: getLandingNavUrl(items, { offline, fallback }) ?? paths.app.sinAcceso.getHref() })
  },
})

// Destino del guard; dentro del layout para conservar el sidebar.
export const sinAccesoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.sinAcceso.path,
  validateSearch: sinAccesoSearchSchema,
  staticData: { breadcrumb: [{ label: "Sin acceso" }] },
  component: SinAccesoPage,
})

// Las reservas de cupo viven ahora en la pestaña "Reservas de cupo" de
// Inscripciones; la URL vieja se conserva solo para no romper enlaces.
export const coberturaReservaCupoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaReservaCupo.path,
  beforeLoad: () => {
    throw redirect({ to: paths.app.coberturaInscritos.getHref(), replace: true })
  },
})

const PreMatriculaPage = lazyRouteComponent(
  () => import("@/features/coverage/pre-matricula/pages/pre-matricula-page"),
  "PreMatriculaPage"
)

export const coberturaPreMatriculaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaPreMatricula.path,
  validateSearch: preMatriculaSearchSchema,
  staticData: { breadcrumb: [COBERTURA_CRUMB, { label: "Pre-Matrícula" }] },
  component: PreMatriculaPage,
})

// Ítem de menú "Inscripciones": vista Inscripción y reservas (Cobertura, Sección 3).
export const coberturaInscritosRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaInscritos.path,
  validateSearch: inscripcionReservasSearchSchema,
  staticData: { breadcrumb: [COBERTURA_CRUMB, { label: "Inscripción y reservas" }] },
  component: InscripcionReservasPage,
})

const ReservaDetallePage = lazyRouteComponent(
  () => import("@/features/coverage/inscripcion-reservas/pages/reserva-detalle-page"),
  "ReservaDetallePage",
)

export const coberturaReservaDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaReservaDetalle.path,
  staticData: {
    breadcrumb: () => [
      COBERTURA_CRUMB,
      { label: "Reservas de cupo", to: paths.app.coberturaInscritos.getHref() },
      { label: "Detalle" },
    ],
  },
  component: ReservaDetallePage,
})

const AsignarGrupoPage = lazyRouteComponent(
  () => import("@/features/coverage/inscripcion-reservas/pages/asignar-grupo-page"),
  "AsignarGrupoPage",
)

export const coberturaReservaAsignarGrupoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaReservaAsignarGrupo.path,
  staticData: {
    breadcrumb: () => [
      COBERTURA_CRUMB,
      { label: "Reservas de cupo", to: paths.app.coberturaInscritos.getHref() },
      { label: "Asignar grupo" },
    ],
  },
  component: AsignarGrupoPage,
})

const InscripcionDetallePage = lazyRouteComponent(
  () => import("@/features/coverage/inscripcion-reservas/pages/inscripcion-detalle-page"),
  "InscripcionDetallePage",
)

export const coberturaInscripcionDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaInscripcionDetalle.path,
  staticData: {
    breadcrumb: () => [
      COBERTURA_CRUMB,
      { label: "Inscripciones", to: `${paths.app.coberturaInscritos.getHref()}?tab=inscripciones` },
      { label: "Detalle" },
    ],
  },
  component: InscripcionDetallePage,
})

const InscripcionEditarPage = lazyRouteComponent(
  () => import("@/features/coverage/inscripcion-reservas/pages/inscripcion-editar-page"),
  "InscripcionEditarPage",
)

export const coberturaInscripcionEditarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaInscripcionEditar.path,
  staticData: {
    breadcrumb: () => [
      COBERTURA_CRUMB,
      { label: "Inscripción y reservas", to: `${paths.app.coberturaInscritos.getHref()}?tab=inscripciones` },
      { label: "Editar inscripción" },
    ],
  },
  component: InscripcionEditarPage,
})

const NuevaInscripcionPage = lazyRouteComponent(
  () => import("@/features/coverage/inscripcion-reservas/pages/inscripcion-editar-page"),
  "NuevaInscripcionPage",
)

const ConfigGrupoPage = lazyRouteComponent(
  () => import("@/features/coverage/inscripcion-reservas/pages/config-grupo-page"),
  "ConfigGrupoPage",
)

export const coberturaConfigGrupoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaConfigGrupo.path,
  staticData: {
    breadcrumb: () => [
      COBERTURA_CRUMB,
      { label: "Configuración", to: `${paths.app.coberturaInscritos.getHref()}?tab=configuracion` },
      { label: "Modificar grupo de admisión" },
    ],
  },
  component: ConfigGrupoPage,
})

const ConfigPeriodoPage = lazyRouteComponent(
  () => import("@/features/coverage/inscripcion-reservas/pages/config-periodo-page"),
  "ConfigPeriodoPage",
)

export const coberturaConfigPeriodoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaConfigPeriodo.path,
  staticData: {
    breadcrumb: () => [
      COBERTURA_CRUMB,
      { label: "Configuración", to: `${paths.app.coberturaInscritos.getHref()}?tab=configuracion&conf=periodos` },
      { label: "Modificar período" },
    ],
  },
  component: ConfigPeriodoPage,
})

export const coberturaInscripcionNuevaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaInscripcionNueva.path,
  staticData: {
    breadcrumb: () => [
      COBERTURA_CRUMB,
      { label: "Inscripción y reservas", to: `${paths.app.coberturaInscritos.getHref()}?tab=inscripciones` },
      { label: "Nueva inscripción" },
    ],
  },
  component: NuevaInscripcionPage,
})

const EnrollmentDetailPage = lazyRouteComponent(
  () => import("@/features/coverage/enrollments/pages/enrollment-detail-page"),
  "EnrollmentDetailPage",
)

export const coberturaInscritoDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaInscritoDetalle.path,
  staticData: {
    breadcrumb: () => [
      COBERTURA_CRUMB,
      { label: "Inscripción y reservas", to: paths.app.coberturaInscritos.getHref() },
      { label: "Detalle" },
    ],
  },
  component: EnrollmentDetailPage,
})

export const coberturaMatriculaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaMatricula.path,
  validateSearch: matriculaSearchSchema,
  staticData: { breadcrumb: [COBERTURA_CRUMB, { label: "Matrícula" }] },
  component: MatriculaPage,
})

export const coberturaMatriculaAgregarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaMatriculaAgregar.path,
  staticData: {
    breadcrumb: [
      COBERTURA_CRUMB,
      { label: "Matrícula", to: paths.app.coberturaMatricula.getHref() },
      { label: "Agregar" },
    ],
  },
  component: AddMatriculaPage,
})

export const coberturaMatriculaEditarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaMatriculaEditar.path,
  validateSearch: matriculaSearchSchema,
  staticData: {
    breadcrumb: [
      COBERTURA_CRUMB,
      { label: "Matrícula", to: paths.app.coberturaMatricula.getHref() },
      { label: "Editar" },
    ],
  },
  component: MatriculaEditPage,
})

export const coberturaMatriculaConfiguracionRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaMatriculaConfiguracion.path,
  staticData: {
    breadcrumb: [
      COBERTURA_CRUMB,
      { label: "Matrícula", to: paths.app.coberturaMatricula.getHref() },
      { label: "Configuración" },
    ],
  },
  component: MatriculaFieldConfigPage,
})

// `detalle/$id` y no `$id` suelto: competía con `agregar` y `configuracion`.
export const coberturaMatriculaDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaMatriculaDetalle.path,
  validateSearch: matriculaSearchSchema,
  staticData: {
    breadcrumb: [
      COBERTURA_CRUMB,
      { label: "Matrícula", to: paths.app.coberturaMatricula.getHref() },
      { label: "Detalle" },
    ],
  },
  component: MatriculaDetailPage,
})

// Un `NoticeProvider` para las cuatro vistas de auditoría.
const auditsLayoutRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  id: "_audits",
  component: () => (
    <NoticeProvider>
      <Outlet />
    </NoticeProvider>
  ),
})

export const auditoriaSesionesRoute = createRoute({
  getParentRoute: () => auditsLayoutRoute,
  path: paths.app.auditoriaSesiones.path,
  validateSearch: auditsSearchSchema,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, REGISTRO_ACTIVIDAD_CRUMB, { label: "Sesiones" }],
  },
  component: AuditSessionPage,
})

export const auditoriaTablasRoute = createRoute({
  getParentRoute: () => auditsLayoutRoute,
  path: paths.app.auditoriaTablas.path,
  validateSearch: auditTablesSearchSchema,
  staticData: {
    breadcrumb: [
      ADMINISTRACION_CRUMB,
      REGISTRO_ACTIVIDAD_CRUMB,
      { label: "Tablas" },
    ],
  },
  component: AuditTablesPage,
})

export const auditoriaTablaDetalleRoute = createRoute({
  getParentRoute: () => auditsLayoutRoute,
  path: paths.app.auditoriaTablaDetalle.path,
  validateSearch: tableOperationsSearchSchema,
  staticData: {
    breadcrumb: (params) => [
      ADMINISTRACION_CRUMB,
      REGISTRO_ACTIVIDAD_CRUMB,
      { label: "Tablas", to: paths.app.auditoriaTablas.getHref() },
      { label: humanizeSlug(params.tableSlug) },
    ],
  },
  component: TableOperationsPage,
})

export const bitacoraRoute = createRoute({
  getParentRoute: () => auditsLayoutRoute,
  path: paths.app.bitacora.path,
  validateSearch: bitacoraSearchSchema,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, REGISTRO_ACTIVIDAD_CRUMB, { label: "Bitácora" }],
  },
  component: BitacoraPage,
})

export const rolesMenusRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.rolesMenus.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, { label: "Configuración de roles y menús" }],
  },
  component: RolesMenusPage,
})

export const listasValorRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.listasValor.path,
  validateSearch: listasValorSearchSchema,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, { label: "Listas de valor" }],
  },
  component: ListasValorPage,
})

export const areasOficialesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.areasOficiales.path,
  validateSearch: areasOficialesSearchSchema,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, { label: "Áreas oficiales" }],
  },
  component: AreasOficialesPage,
})

export const superadministradoresRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.superadministradores.path,
  validateSearch: superadministradoresSearchSchema,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, { label: "Superadministradores" }],
  },
  component: SuperadministradoresPage,
})

const SUPERVISORES_CRUMB = {
  label: "Supervisores territoriales",
  to: paths.app.supervisoresTerritoriales.getHref(),
}

export const supervisoresTerritorialesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.supervisoresTerritoriales.path,
  validateSearch: supervisoresSearchSchema,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, { label: "Supervisores territoriales" }],
  },
  component: SupervisoresTerritorialesPage,
})

export const supervisorTerritorialNuevoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.supervisorTerritorialNuevo.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, SUPERVISORES_CRUMB, { label: "Nuevo Supervisor territorial" }],
  },
  component: SupervisorNuevoPage,
})

export const supervisorTerritorialDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.supervisorTerritorialDetalle.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, SUPERVISORES_CRUMB, { label: "Ver detalle" }],
  },
  component: SupervisorDetallePage,
})

export const supervisorTerritorialModificarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.supervisorTerritorialModificar.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, SUPERVISORES_CRUMB, { label: "Modificar" }],
  },
  component: SupervisorModificarPage,
})

const ADMINISTRADORES_CRUMB = {
  label: "Administradores territoriales",
  to: paths.app.administradoresTerritoriales.getHref(),
}

export const administradoresTerritorialesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.administradoresTerritoriales.path,
  validateSearch: administradoresSearchSchema,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, { label: "Administradores territoriales" }],
  },
  component: AdministradoresTerritorialesPage,
})

export const administradorTerritorialNuevoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.administradorTerritorialNuevo.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, ADMINISTRADORES_CRUMB, { label: "Nuevo Administrador territorial" }],
  },
  component: AdministradorNuevoPage,
})

export const administradorTerritorialDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.administradorTerritorialDetalle.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, ADMINISTRADORES_CRUMB, { label: "Ver detalle" }],
  },
  component: AdministradorDetallePage,
})

export const administradorTerritorialModificarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.administradorTerritorialModificar.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, ADMINISTRADORES_CRUMB, { label: "Modificar" }],
  },
  component: AdministradorModificarPage,
})

export const criteriosPrioridadRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.criteriosPrioridad.path,
  validateSearch: criteriosPrioridadSearchSchema,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, { label: "Criterios de prioridad" }],
  },
  component: CriteriosPrioridadPage,
})

const CRITERIOS_CRUMB = { label: "Criterios de prioridad", to: paths.app.criteriosPrioridad.getHref() }

export const criterioPrioridadNuevoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.criterioPrioridadNuevo.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, CRITERIOS_CRUMB, { label: "Nuevo criterio" }],
  },
  component: CriterioNuevoPage,
})

export const criterioPrioridadDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.criterioPrioridadDetalle.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, CRITERIOS_CRUMB, { label: "Ver detalle" }],
  },
  component: CriterioDetallePage,
})

export const criterioPrioridadModificarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.criterioPrioridadModificar.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, CRITERIOS_CRUMB, { label: "Modificar" }],
  },
  component: CriterioModificarPage,
})

export const parametrosEdadRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.parametrosEdad.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, { label: "Parámetros de edad" }],
  },
  component: ParametrosEdadPage,
})

export const relacionesAlumnoGrupoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.relacionesAlumnoGrupo.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, { label: "Relaciones alumno-grupo" }],
  },
  component: RelacionesAlumnoGrupoPage,
})

export const festivosRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.festivos.path,
  validateSearch: festivosSearchSchema,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, { label: "Festivos" }],
  },
  component: FestivosPage,
})

const CONSERVACION_CRUMB = { label: "Conservación de datos", to: paths.app.conservacionDatos.getHref() }

export const conservacionDatosRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.conservacionDatos.path,
  validateSearch: conservacionSearchSchema,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, { label: "Conservación de datos" }],
  },
  component: ConservacionDatosPage,
})

export const conservacionPoliticaNuevaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.conservacionPoliticaNueva.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, CONSERVACION_CRUMB, { label: "Nueva política" }],
  },
  component: PoliticaFormPage,
})

export const conservacionPoliticaEditarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.conservacionPoliticaEditar.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, CONSERVACION_CRUMB, { label: "Modificar política" }],
  },
  component: PoliticaFormPage,
})

// Un `NoticeProvider` compartido: el aviso de un formulario sigue visible al
// volver al listado.
const establishmentLayoutRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  id: "_establishment",
  component: () => (
    <NoticeProvider>
      <Outlet />
    </NoticeProvider>
  ),
})

export const establishmentsRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.general.path,
  validateSearch: establishmentsSearchSchema,
  staticData: { breadcrumb: [ESTABLECIMIENTO_CRUMB, { label: "Establecimiento" }] },
  component: EstablishmentsPage,
})

export const campusesRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.campuses.path,
  validateSearch: campusesSearchSchema,
  staticData: { breadcrumb: [ESTABLECIMIENTO_CRUMB, { label: "Sedes educativas" }] },
  component: CampusesPage,
})

const SEDES_CRUMB = { label: "Sedes educativas", to: paths.app.establishments.campuses.getHref() }

export const campusAddRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.campusAdd.path,
  staticData: { breadcrumb: [ESTABLECIMIENTO_CRUMB, SEDES_CRUMB, { label: "Nueva sede" }] },
  component: CampusFormPage,
})

export const campusDetailRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.campusDetail.path,
  staticData: { breadcrumb: [ESTABLECIMIENTO_CRUMB, SEDES_CRUMB, { label: "Detalle" }] },
  component: CampusFormPage,
})

export const campusEditRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.campusEdit.path,
  staticData: { breadcrumb: [ESTABLECIMIENTO_CRUMB, SEDES_CRUMB, { label: "Modificar" }] },
  component: CampusFormPage,
})

export const employeesRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.officials.path,
  validateSearch: employeesSearchSchema,
  staticData: { breadcrumb: [ESTABLECIMIENTO_CRUMB, { label: "Funcionarios" }] },
  component: EmployeesPage,
})

const FUNCIONARIOS_CRUMB = { label: "Funcionarios", to: paths.app.establishments.officials.getHref() }

export const employeeAddRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.officialAdd.path,
  validateSearch: employeeFormSearchSchema,
  staticData: { breadcrumb: [ESTABLECIMIENTO_CRUMB, FUNCIONARIOS_CRUMB, { label: "Nuevo funcionario" }] },
  component: EmployeeFormPage,
})

export const employeeDetailRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.officialDetail.path,
  validateSearch: employeeFormSearchSchema,
  staticData: { breadcrumb: [ESTABLECIMIENTO_CRUMB, FUNCIONARIOS_CRUMB, { label: "Detalle" }] },
  component: EmployeeFormPage,
})

export const employeeEditRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.officialEdit.path,
  validateSearch: employeeFormSearchSchema,
  staticData: { breadcrumb: [ESTABLECIMIENTO_CRUMB, FUNCIONARIOS_CRUMB, { label: "Modificar" }] },
  component: EmployeeFormPage,
})

export const employeeRolesRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.officialRoles.path,
  validateSearch: employeeFormSearchSchema,
  staticData: { breadcrumb: [ESTABLECIMIENTO_CRUMB, FUNCIONARIOS_CRUMB, { label: "Roles y permisos" }] },
  component: EmployeeRolesPage,
})

export const employeeRolePermissionsRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.officialRolePermissions.path,
  validateSearch: employeeFormSearchSchema,
  staticData: {
    breadcrumb: (params) => [
      ESTABLECIMIENTO_CRUMB,
      FUNCIONARIOS_CRUMB,
      { label: "Roles y permisos", to: paths.app.establishments.officialRoles.getHref(params.employeeId) },
      { label: "Permisos" },
    ],
  },
  component: EmployeeRolePermissionsPage,
})

export const addEstablishmentRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.add.path,
  validateSearch: establishmentsSearchSchema,
  staticData: {
    breadcrumb: [
      ESTABLECIMIENTO_CRUMB,
      { label: "Establecimiento", to: paths.app.establishments.general.getHref() },
      { label: "Agregar" },
    ],
  },
  component: AddEstablishmentPage,
})

export const establishmentDetailRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.detail.path,
  validateSearch: establishmentsSearchSchema,
  staticData: {
    breadcrumb: [
      ESTABLECIMIENTO_CRUMB,
      { label: "Establecimiento", to: paths.app.establishments.general.getHref() },
      { label: "Detalle" },
    ],
  },
  component: EstablishmentDetailPage,
})

export const editEstablishmentRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.edit.path,
  validateSearch: establishmentsSearchSchema,
  staticData: {
    breadcrumb: [
      ESTABLECIMIENTO_CRUMB,
      { label: "Establecimiento", to: paths.app.establishments.general.getHref() },
      { label: "Editar" },
    ],
  },
  component: AddEstablishmentPage,
})

export const auditoriaSesionOperacionesRoute = createRoute({
  getParentRoute: () => auditsLayoutRoute,
  path: paths.app.auditoriaSesionOperaciones.path,
  validateSearch: sessionOperationsSearchSchema,
  staticData: {
    breadcrumb: [
      ADMINISTRACION_CRUMB,
      REGISTRO_ACTIVIDAD_CRUMB,
      { label: "Sesiones", to: paths.app.auditoriaSesiones.getHref() },
      { label: "Operaciones" },
    ],
  },
  component: SessionOperationsPage,
})

export const periodosAcademicosRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.periodosAcademicos.path,
  validateSearch: academicPeriodsSearchSchema,
  staticData: { breadcrumb: [ESTABLECIMIENTO_CRUMB, { label: "Periodos académicos" }] },
  component: AcademicPeriodsPage,
})

export const periodosAcademicosAgregarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.periodosAcademicosAgregar.path,
  validateSearch: academicPeriodsSearchSchema,
  staticData: {
    breadcrumb: [ESTABLECIMIENTO_CRUMB, PERIODOS_CRUMB, { label: "Agregar" }],
  },
  component: AcademicPeriodConfigPage,
})

export const periodosAcademicosVerRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.periodosAcademicosVer.path,
  validateSearch: academicPeriodsSearchSchema,
  staticData: {
    breadcrumb: [ESTABLECIMIENTO_CRUMB, PERIODOS_CRUMB, { label: "Ver" }],
  },
  component: AcademicPeriodViewPage,
})

export const periodosAcademicosEditarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.periodosAcademicosEditar.path,
  validateSearch: academicPeriodsSearchSchema,
  staticData: {
    breadcrumb: [ESTABLECIMIENTO_CRUMB, PERIODOS_CRUMB, { label: "Editar" }],
  },
  component: AcademicPeriodConfigPage,
})

const gradeCrumbs = (periodId: string, label: string) => [
  ESTABLECIMIENTO_CRUMB,
  PERIODOS_CRUMB,
  { label: "Editar", to: paths.app.periodosAcademicosEditar.getHref(periodId) },
  { label },
]

export const periodosGradoAgregarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.periodosGradoAgregar.path,
  staticData: {
    breadcrumb: (params) => gradeCrumbs(params.periodId, "Nuevo grado"),
  },
  component: GradePage,
})

export const periodosGradoEditarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.periodosGradoEditar.path,
  validateSearch: gradeSearchSchema,
  staticData: {
    breadcrumb: (params) => gradeCrumbs(params.periodId, "Grado"),
  },
  component: GradePage,
})

const ReportsPage = lazyRouteComponent(
  () => import("@/features/academic-management/reports/pages/reports-page"),
  "ReportsPage",
)
const PlanillaInformePage = lazyRouteComponent(
  () => import("@/features/academic-management/reports/pages/planilla-informe-page"),
  "PlanillaInformePage",
)
const CurricularReferencesPage = lazyRouteComponent(
  () => import("@/features/academic-management/curricular-references/pages/curricular-references-page"),
  "CurricularReferencesPage",
)
const CurricularReferenceDetailPage = lazyRouteComponent(
  () =>
    import(
      "@/features/academic-management/curricular-references/pages/curricular-reference-detail-page"
    ),
  "CurricularReferenceDetailPage",
)

export const gestionAcademicaInformesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.gestionAcademicaInformes.path,
  validateSearch: informesSearchSchema,
  staticData: { breadcrumb: [GESTION_ACADEMICA_CRUMB, { label: "Informes" }] },
  component: ReportsPage,
})

const INFORMES_CRUMB = { label: "Informes", to: paths.app.gestionAcademicaInformes.getHref() }

export const planillaInformeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.gestionAcademicaInformesPlanilla.path,
  validateSearch: planillaInformeSearchSchema,
  staticData: { breadcrumb: [GESTION_ACADEMICA_CRUMB, INFORMES_CRUMB, { label: "Planilla de calificación" }] },
  component: PlanillaInformePage,
})

export const gestionAcademicaReferentesCurricularesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.gestionAcademicaReferentesCurriculares.path,
  validateSearch: curricularReferencesSearchSchema,
  staticData: { breadcrumb: [GESTION_ACADEMICA_CRUMB, { label: "Referentes curriculares" }] },
  component: CurricularReferencesPage,
})

const REFERENTES_CURRICULARES_CRUMB = {
  label: "Referentes curriculares",
  to: paths.app.gestionAcademicaReferentesCurriculares.getHref(),
}

export const gestionAcademicaReferentesCurricularesDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.gestionAcademicaReferentesCurricularesDetalle.path,
  validateSearch: curricularReferencesSearchSchema,
  staticData: {
    breadcrumb: [GESTION_ACADEMICA_CRUMB, REFERENTES_CURRICULARES_CRUMB, { label: "Detalle" }],
  },
  component: CurricularReferenceDetailPage,
})

const PLANEADOR_CRUMB = {
  label: "Planeador",
  to: paths.app.planeadorActividades.getHref(),
}

export const planeadorRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.planeadorActividades.path,
  validateSearch: planeadorSearchSchema,
  staticData: { breadcrumb: [PLANEADOR_CRUMB] },
  component: PlaneadorPage,
})

export const planeadorActividadCrearRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.planeadorActividadCrear.path,
  validateSearch: planeadorActividadCrearSearchSchema,
  staticData: { breadcrumb: [PLANEADOR_CRUMB, { label: "Agregar" }] },
  component: PlaneadorCrearActividadPage,
})

// La miga del medio es la pestaña de Unidades (`?instrumento=`).
const unidadesCrumb = (search: Record<string, unknown>) => ({
  label: typeof search.instrumento === "string" && search.instrumento ? search.instrumento : "Unidad temática",
})

export const planeadorUnidadesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.planeadorUnidades.path,
  validateSearch: planeadorUnidadesSearchSchema,
  staticData: { breadcrumb: (_params, search) => [PLANEADOR_CRUMB, unidadesCrumb(search)] },
  component: PlaneadorUnidadesPage,
})

export const planeadorUnidadCrearRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.planeadorUnidadCrear.path,
  validateSearch: planeadorUnidadCrearSearchSchema,
  staticData: {
    breadcrumb: (_params, search) => [PLANEADOR_CRUMB, unidadesCrumb(search), { label: "Agregar" }],
  },
  component: PlaneadorCrearUnidadPage,
})

export const planeadorUnidadEditarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.planeadorUnidadEditar.path,
  validateSearch: planeadorUnidadEditarSearchSchema,
  staticData: {
    breadcrumb: (_params, search) => [PLANEADOR_CRUMB, unidadesCrumb(search), { label: "Editar" }],
  },
  component: PlaneadorEditarUnidadPage,
})

export const planeadorActividadEditarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.planeadorActividadEditar.path,
  staticData: {
    breadcrumb: (params) => [
      PLANEADOR_CRUMB,
      { label: `Actividad ${params.actividadId}` },
      { label: "Editar" },
    ],
  },
  component: PlaneadorEditarActividadPage,
})

export const planeadorRecursoPreviewRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.planeadorRecursoPreview.path,
  validateSearch: planeadorRecursoPreviewSearchSchema,
  staticData: {
    breadcrumb: [PLANEADOR_CRUMB, { label: "Vista previa del recurso" }],
  },
  component: PlaneadorRecursoPreviewPage,
})

export const planeadorPlanillaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.planeadorPlanilla.path,
  staticData: {
    breadcrumb: [PLANEADOR_CRUMB, { label: "Planilla de calificación" }],
  },
  component: PlaneadorPlanillaPage,
})

const AsistenciaPage = lazyRouteComponent(
  () => import("@/features/academic-management/asistencia/pages/asistencia-page"),
  "AsistenciaPage",
)

export const asistenciaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.asistencia.path,
  validateSearch: asistenciaSearchSchema,
  staticData: { breadcrumb: [GESTION_ACADEMICA_CRUMB, { label: "Asistencia" }] },
  component: AsistenciaPage,
})

const ConvivenciaPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/convivencia/pages/convivencia-page"),
  "ConvivenciaPage",
)

export const convivenciaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.convivencia.path,
  validateSearch: convivenciaSearchSchema,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, { label: "Convivencia" }] },
  component: ConvivenciaPage,
})

const NuevoCasoPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/convivencia/pages/caso-form-page"),
  "NuevoCasoPage",
)

export const convivenciaNuevoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.convivenciaNuevo.path,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, CONVIVENCIA_CRUMB, { label: "Nuevo caso" }] },
  component: NuevoCasoPage,
})

const EditarCasoPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/convivencia/pages/caso-form-page"),
  "EditarCasoPage",
)

// El id viaja por props: la página no importa la ruta (evita el ciclo router ↔ página).
export const convivenciaEditarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.convivenciaEditar.path,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, CONVIVENCIA_CRUMB, { label: "Modificar caso" }] },
  component: function EditarCasoRoute() {
    const { casoId } = convivenciaEditarRoute.useParams()
    return <EditarCasoPage casoId={Number(casoId)} />
  },
})

const CasoDetallePage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/convivencia/pages/caso-detalle-page"),
  "CasoDetallePage",
)

export const convivenciaCasoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.convivenciaCaso.path,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, CONVIVENCIA_CRUMB, { label: "Detalle del caso" }] },
  component: function CasoDetalleRoute() {
    const { casoId } = convivenciaCasoRoute.useParams()
    return <CasoDetallePage casoId={Number(casoId)} />
  },
})

const ProcesoFormPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/convivencia/pages/proceso-form-page"),
  "ProcesoFormPage",
)
const ConvivenciaProcesoDetallePage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/convivencia/pages/proceso-detalle-page"),
  "ProcesoDetallePage",
)

const numeroOpcional = (v: unknown) => (v == null || v === "" || Number.isNaN(Number(v)) ? undefined : Number(v))

/** Abrir proceso: vacío, desde una anotación (`?matricula=&anotacion=`) o desde un caso (`?caso=`). */
export const convivenciaProcesoNuevoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.convivenciaProcesoNuevo.path,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, CONVIVENCIA_CRUMB, { label: "Abrir proceso" }] },
  validateSearch: (search: Record<string, unknown>) => ({
    matricula: numeroOpcional(search.matricula),
    anotacion: numeroOpcional(search.anotacion),
    caso: numeroOpcional(search.caso),
    nombre: typeof search.nombre === "string" && search.nombre ? search.nombre : undefined,
  }),
  component: function ProcesoNuevoRoute() {
    const origen = convivenciaProcesoNuevoRoute.useSearch()
    return <ProcesoFormPage origen={origen} />
  },
})

export const convivenciaProcesoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.convivenciaProceso.path,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, CONVIVENCIA_CRUMB, { label: "Detalle del proceso" }] },
  component: function ProcesoDetalleRoute() {
    const { procesoId } = convivenciaProcesoRoute.useParams()
    return <ConvivenciaProcesoDetallePage procesoId={Number(procesoId)} />
  },
})

const CatalogoAnotacionesPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/catalogo-anotaciones/pages/catalogo-anotaciones-page"),
  "CatalogoAnotacionesPage",
)

export const catalogoAnotacionesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.catalogoAnotaciones.path,
  validateSearch: catalogoSearchSchema,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, { label: "Catálogo de anotaciones" }] },
  component: CatalogoAnotacionesPage,
})

const CitacionesCompromisosPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/citaciones/pages/citaciones-compromisos-page"),
  "CitacionesCompromisosPage",
)

export const citacionesCompromisosRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.citacionesCompromisos.path,
  validateSearch: citacionesSearchSchema,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, { label: "Citaciones y compromisos" }] },
  component: CitacionesCompromisosPage,
})

const ReconocimientosPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/reconocimientos/pages/reconocimientos-page"),
  "ReconocimientosPage",
)

export const reconocimientosRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.reconocimientos.path,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, { label: "Reconocimientos" }] },
  component: ReconocimientosPage,
})

const ReintegracionPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/reintegracion/pages/reintegracion-page"),
  "ReintegracionPage",
)

export const reintegracionRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.reintegracion.path,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, { label: "Reintegración" }] },
  component: ReintegracionPage,
})

const REINTEGRACION_CRUMBS = [
  GESTION_ESTUDIANTIL_CRUMB,
  { label: "Reintegración", to: paths.app.reintegracion.getHref() },
]

const ReintegracionAbrirCasoPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/reintegracion/pages/abrir-caso-page"),
  "AbrirCasoPage",
)

export const reintegracionAbrirRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.reintegracionAbrir.path,
  staticData: { breadcrumb: [...REINTEGRACION_CRUMBS, { label: "Abrir caso" }] },
  component: ReintegracionAbrirCasoPage,
})

const ReintegracionCasoPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/reintegracion/pages/caso-detalle-page"),
  "CasoDetallePage",
)

export const reintegracionCasoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.reintegracionCaso.path,
  staticData: { breadcrumb: [...REINTEGRACION_CRUMBS, { label: "Caso" }] },
  component: function ReintegracionCasoRoute() {
    const { casoId } = reintegracionCasoRoute.useParams()
    return <ReintegracionCasoPage casoId={Number(casoId)} />
  },
})

const ReintegracionConvivenciaPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/reintegracion/pages/abrir-convivencia-page"),
  "AbrirConvivenciaPage",
)

export const reintegracionConvivenciaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.reintegracionConvivencia.path,
  staticData: { breadcrumb: [...REINTEGRACION_CRUMBS, { label: "Abrir caso de convivencia" }] },
  component: function ReintegracionConvivenciaRoute() {
    const { casoId } = reintegracionConvivenciaRoute.useParams()
    return <ReintegracionConvivenciaPage casoId={Number(casoId)} />
  },
})

const PrevencionPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/prevencion/pages/prevencion-page"),
  "PrevencionPage",
)

export const prevencionRetencionRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.prevencionRetencion.path,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, { label: "Prevención y retención" }] },
  component: PrevencionPage,
})

const PrevencionHistorialPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/prevencion/pages/historial-page"),
  "HistorialPage",
)

export const prevencionHistorialRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.prevencionHistorial.path,
  staticData: {
    breadcrumb: [
      GESTION_ESTUDIANTIL_CRUMB,
      { label: "Prevención y retención", to: paths.app.prevencionRetencion.getHref() },
      { label: "Historial" },
    ],
  },
  // `grupo` (Grado/Grupo) lo manda el tablero: el historial no lo devuelve.
  validateSearch: (search: Record<string, unknown>): { grupo?: string } => ({
    grupo: typeof search.grupo === "string" ? search.grupo : undefined,
  }),
  component: function PrevencionHistorialRoute() {
    const { matricula } = prevencionHistorialRoute.useParams()
    const { grupo } = prevencionHistorialRoute.useSearch()
    return <PrevencionHistorialPage matricula={Number(matricula)} gradoGrupo={grupo} />
  },
})

const PrevencionValorarPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/prevencion/pages/valorar-page"),
  "ValorarPage",
)
const PrevencionPlanNuevoPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/prevencion/pages/plan-form-page"),
  "PlanNuevoPage",
)
const PrevencionPlanEditarPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/prevencion/pages/plan-form-page"),
  "PlanEditarPage",
)

const numeroDeSearch = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 ? n : undefined
}
const PREVENCION_CRUMBS = [
  GESTION_ESTUDIANTIL_CRUMB,
  { label: "Prevención y retención", to: paths.app.prevencionRetencion.getHref() },
]

export const prevencionValorarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.prevencionValorar.path,
  staticData: { breadcrumb: [...PREVENCION_CRUMBS, { label: "Valorar riesgo" }] },
  validateSearch: (search: Record<string, unknown>): { matricula?: number } => ({
    matricula: numeroDeSearch(search.matricula),
  }),
  component: function PrevencionValorarRoute() {
    const { matricula } = prevencionValorarRoute.useSearch()
    return <PrevencionValorarPage matricula={matricula} />
  },
})

export const prevencionPlanNuevoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.prevencionPlanNuevo.path,
  staticData: { breadcrumb: [...PREVENCION_CRUMBS, { label: "Nuevo plan" }] },
  validateSearch: (search: Record<string, unknown>): { matricula?: number; valoracion?: number } => ({
    matricula: numeroDeSearch(search.matricula),
    valoracion: numeroDeSearch(search.valoracion),
  }),
  component: function PrevencionPlanNuevoRoute() {
    const { matricula, valoracion } = prevencionPlanNuevoRoute.useSearch()
    return <PrevencionPlanNuevoPage matricula={matricula} valoracion={valoracion} />
  },
})

const PrevencionPlanDetallePage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/prevencion/pages/plan-detalle-page"),
  "PlanDetallePage",
)
const PrevencionValoracionDetallePage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/prevencion/pages/valoracion-detalle-page"),
  "ValoracionDetallePage",
)

export const prevencionPlanDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.prevencionPlanDetalle.path,
  staticData: { breadcrumb: [...PREVENCION_CRUMBS, { label: "Plan de acompañamiento" }] },
  component: function PrevencionPlanDetalleRoute() {
    const { planId } = prevencionPlanDetalleRoute.useParams()
    return <PrevencionPlanDetallePage planId={Number(planId)} />
  },
})

const PrevencionAbrirCasoPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/prevencion/pages/abrir-caso-page"),
  "AbrirCasoPage",
)

export const prevencionPlanCasoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.prevencionPlanCaso.path,
  staticData: { breadcrumb: [...PREVENCION_CRUMBS, { label: "Abrir caso de convivencia" }] },
  component: function PrevencionPlanCasoRoute() {
    const { planId } = prevencionPlanCasoRoute.useParams()
    return <PrevencionAbrirCasoPage planId={Number(planId)} />
  },
})

export const prevencionValoracionDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.prevencionValoracionDetalle.path,
  staticData: { breadcrumb: [...PREVENCION_CRUMBS, { label: "Valoración" }] },
  component: function PrevencionValoracionDetalleRoute() {
    const { valoracionId } = prevencionValoracionDetalleRoute.useParams()
    return <PrevencionValoracionDetallePage valoracionId={Number(valoracionId)} />
  },
})

const PrevencionReporteSaludMentalPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/prevencion/pages/reporte-salud-mental-page"),
  "ReporteSaludMentalPage",
)
const PrevencionSenalSaludMentalPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/prevencion/pages/senal-salud-mental-page"),
  "SenalSaludMentalPage",
)

export const prevencionSaludMentalNuevoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.prevencionSaludMentalNuevo.path,
  staticData: { breadcrumb: [...PREVENCION_CRUMBS, { label: "Nuevo reporte de salud mental" }] },
  // Desde el Observador llega el estudiante elegido: `matricula` y su nombre para leer «Nombre · grado».
  validateSearch: (search: Record<string, unknown>): { matricula?: number; estudiante?: string } => ({
    matricula: Number.isFinite(Number(search.matricula)) && search.matricula != null ? Number(search.matricula) : undefined,
    estudiante: typeof search.estudiante === "string" ? search.estudiante : undefined,
  }),
  component: PrevencionReporteSaludMentalPage,
})

export const prevencionSenalSaludMentalRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.prevencionSenalSaludMental.path,
  staticData: { breadcrumb: [...PREVENCION_CRUMBS, { label: "Señal de salud mental" }] },
  component: function PrevencionSenalSaludMentalRoute() {
    const { senalId } = prevencionSenalSaludMentalRoute.useParams()
    return <PrevencionSenalSaludMentalPage senalId={Number(senalId)} />
  },
})

export const prevencionPlanEditarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.prevencionPlanEditar.path,
  staticData: { breadcrumb: [...PREVENCION_CRUMBS, { label: "Modificar plan" }] },
  component: function PrevencionPlanEditarRoute() {
    const { planId } = prevencionPlanEditarRoute.useParams()
    return <PrevencionPlanEditarPage planId={Number(planId)} />
  },
})

const PrevencionEstrategiaFormPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/prevencion/pages/estrategia-form-page"),
  "EstrategiaNuevaPage",
)
const PrevencionEstrategiaEditarPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/prevencion/pages/estrategia-form-page"),
  "EstrategiaEditarPage",
)
const PrevencionEstrategiaDetallePage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/prevencion/pages/estrategia-detalle-page"),
  "EstrategiaDetallePage",
)

export const prevencionEstrategiaNuevaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.prevencionEstrategiaNueva.path,
  staticData: { breadcrumb: [...PREVENCION_CRUMBS, { label: "Nueva estrategia" }] },
  component: PrevencionEstrategiaFormPage,
})

export const prevencionEstrategiaEditarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.prevencionEstrategiaEditar.path,
  staticData: { breadcrumb: [...PREVENCION_CRUMBS, { label: "Modificar estrategia" }] },
  component: function PrevencionEstrategiaEditarRoute() {
    const { estrategiaId } = prevencionEstrategiaEditarRoute.useParams()
    return <PrevencionEstrategiaEditarPage estrategiaId={Number(estrategiaId)} />
  },
})

export const prevencionEstrategiaDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.prevencionEstrategiaDetalle.path,
  staticData: { breadcrumb: [...PREVENCION_CRUMBS, { label: "Estrategia" }] },
  component: function PrevencionEstrategiaDetalleRoute() {
    const { estrategiaId } = prevencionEstrategiaDetalleRoute.useParams()
    return <PrevencionEstrategiaDetallePage estrategiaId={Number(estrategiaId)} />
  },
})

const PrevencionCaracterizacionPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/prevencion/pages/caracterizacion-page"),
  "CaracterizacionDetallePage",
)
const PrevencionCaracterizacionEditarPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/prevencion/pages/caracterizacion-page"),
  "CaracterizacionEditarPage",
)

export const prevencionCaracterizacionRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.prevencionCaracterizacion.path,
  staticData: { breadcrumb: [...PREVENCION_CRUMBS, { label: "Caracterización familiar" }] },
  component: function PrevencionCaracterizacionRoute() {
    const { matricula } = prevencionCaracterizacionRoute.useParams()
    return <PrevencionCaracterizacionPage matricula={Number(matricula)} />
  },
})

export const prevencionCaracterizacionEditarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.prevencionCaracterizacionEditar.path,
  staticData: { breadcrumb: [...PREVENCION_CRUMBS, { label: "Modificar caracterización" }] },
  component: function PrevencionCaracterizacionEditarRoute() {
    const { matricula } = prevencionCaracterizacionEditarRoute.useParams()
    return <PrevencionCaracterizacionEditarPage matricula={Number(matricula)} />
  },
})

const PrevencionHistorialAcademicoPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/prevencion/pages/historial-academico-page"),
  "HistorialAcademicoPage",
)

export const prevencionHistorialAcademicoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.prevencionHistorialAcademico.path,
  staticData: { breadcrumb: [...PREVENCION_CRUMBS, { label: "Historial académico" }] },
  component: function PrevencionHistorialAcademicoRoute() {
    const { matricula } = prevencionHistorialAcademicoRoute.useParams()
    return <PrevencionHistorialAcademicoPage matricula={Number(matricula)} />
  },
})

/** Enlace del aviso `RECONOCIMIENTO_NUEVO`: la misma página; la fase 2 abre el detalle con el id. */
export const reconocimientoDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.reconocimientoDetalle.path,
  staticData: {
    breadcrumb: [
      GESTION_ESTUDIANTIL_CRUMB,
      { label: "Reconocimientos", to: paths.app.reconocimientos.getHref() },
      { label: "Detalle del reconocimiento" },
    ],
  },
  component: ReconocimientosPage,
})

const ObservacionesSugerenciasPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/observaciones/pages/observaciones-sugerencias-page"),
  "ObservacionesSugerenciasPage",
)

export const observacionesSugerenciasRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.observacionesSugerencias.path,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, { label: "Observaciones y sugerencias" }] },
  component: ObservacionesSugerenciasPage,
})

const CITACIONES_CRUMB = { label: "Citaciones y compromisos", to: paths.app.citacionesCompromisos.getHref() }

const CitacionFormPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/citaciones/pages/citacion-form-page"),
  "CitacionFormPage",
)
const CompromisoFormPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/citaciones/pages/compromiso-form-page"),
  "CompromisoFormPage",
)
const CompromisoDetallePage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/citaciones/pages/compromiso-detalle-page"),
  "CompromisoDetallePage",
)

export const citacionNuevaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.citacionNueva.path,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, CITACIONES_CRUMB, { label: "Nueva citación" }] },
  validateSearch: origenSearchSchema,
  component: function CitacionNuevaRoute() {
    const search = citacionNuevaRoute.useSearch()
    return <CitacionFormPage origen={origenDeSearch(search)} matricula={search.matricula} estudiante={search.estudiante} />
  },
})

/** Nuevo compromiso: vacío o desde una citación Asistió (`?citacion=`). */
export const compromisoNuevoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.compromisoNuevo.path,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, CITACIONES_CRUMB, { label: "Nuevo compromiso" }] },
  validateSearch: (search: Record<string, unknown>) => ({
    citacion: numeroOpcional(search.citacion),
    ...origenSearchSchema.parse(search),
  }),
  component: function CompromisoNuevoRoute() {
    const search = compromisoNuevoRoute.useSearch()
    return <CompromisoFormPage citacion={search.citacion} origen={origenDeSearch(search)} matricula={search.matricula} estudiante={search.estudiante} />
  },
})

export const compromisoDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.compromisoDetalle.path,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, CITACIONES_CRUMB, { label: "Detalle del compromiso" }] },
  component: function CompromisoDetalleRoute() {
    const { compromisoId } = compromisoDetalleRoute.useParams()
    return <CompromisoDetallePage compromisoId={Number(compromisoId)} />
  },
})

const ComiteIntegrantesPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/convivencia/pages/comite-integrantes-page"),
  "ComiteIntegrantesPage",
)

export const convivenciaComiteIntegrantesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.convivenciaComiteIntegrantes.path,
  validateSearch: comitePeriodoSearchSchema,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, CONVIVENCIA_CRUMB, { label: "Integrantes" }] },
  component: function ComiteIntegrantesRoute() {
    const { periodo } = convivenciaComiteIntegrantesRoute.useSearch()
    return <ComiteIntegrantesPage periodo={periodo} />
  },
})

const SesionFormPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/convivencia/pages/sesion-form-page"),
  "SesionFormPage",
)

export const convivenciaSesionNuevaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.convivenciaSesionNueva.path,
  validateSearch: comitePeriodoSearchSchema,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, CONVIVENCIA_CRUMB, { label: "Nueva sesión" }] },
  component: function SesionNuevaRoute() {
    const { periodo } = convivenciaSesionNuevaRoute.useSearch()
    return <SesionFormPage periodo={periodo} />
  },
})

const SesionDetallePage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/convivencia/pages/sesion-detalle-page"),
  "SesionDetallePage",
)

export const convivenciaSesionRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.convivenciaSesion.path,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, CONVIVENCIA_CRUMB, { label: "Sesión del Comité" }] },
  component: function SesionRoute() {
    const { sesionId } = convivenciaSesionRoute.useParams()
    return <SesionDetallePage sesionId={Number(sesionId)} />
  },
})

export const convivenciaSesionEditarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.convivenciaSesionEditar.path,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, CONVIVENCIA_CRUMB, { label: "Modificar sesión" }] },
  component: function SesionEditarRoute() {
    const { sesionId } = convivenciaSesionEditarRoute.useParams()
    return <SesionFormPage sesionId={Number(sesionId)} />
  },
})

const ObservadorPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/observador/pages/observador-page"),
  "ObservadorPage",
)

const INCLUSION_CRUMB = { label: "Inclusión y orientación", to: paths.app.inclusionOrientacion.getHref() }
const PiarListaPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/inclusion/piar/pages/piar-lista-page"),
  "PiarListaPage",
)
const PiarNuevoPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/inclusion/piar/pages/piar-nuevo-page"),
  "PiarNuevoPage",
)
const PiarFichaPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/inclusion/piar/pages/piar-ficha-page"),
  "PiarFichaPage",
)
const PiarHistorialPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/inclusion/piar/pages/piar-historial-page"),
  "PiarHistorialPage",
)
export const inclusionOrientacionRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.inclusionOrientacion.path,
  validateSearch: (s: Record<string, unknown>): { tab?: "orientacion" | "informe" } =>
    s.tab === "orientacion" || s.tab === "informe" ? { tab: s.tab } : {},
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, { label: "Inclusión y orientación" }] },
  component: PiarListaPage,
})
const AtencionFormPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/inclusion/orientacion/pages/atencion-form-page"),
  "AtencionFormPage",
)
const validarBusquedaAtencion = (s: Record<string, unknown>) => ({
  ...(s.matricula ? { matricula: Number(s.matricula) } : {}),
  ...(s.remision ? { remision: Number(s.remision) } : {}),
  ...(s.motivo ? { motivo: Number(s.motivo) } : {}),
  ...(s.estudiante ? { estudiante: String(s.estudiante) } : {}),
  ...(s.ver ? { ver: true } : {}),
})
export const atencionNuevaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.atencionNueva.path,
  validateSearch: validarBusquedaAtencion,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, INCLUSION_CRUMB, { label: "Nueva atención" }] },
  component: AtencionFormPage,
})
export const atencionFichaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.atencionFicha.path,
  validateSearch: validarBusquedaAtencion,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, INCLUSION_CRUMB, { label: "Atención" }] },
  component: AtencionFormPage,
})
export const piarNuevoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.piarNuevo.path,
  validateSearch: (s: Record<string, unknown>): { matricula?: number } => (s.matricula ? { matricula: Number(s.matricula) } : {}),
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, INCLUSION_CRUMB, { label: "Nuevo PIAR" }] },
  component: PiarNuevoPage,
})
export const piarFichaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.piarFicha.path,
  validateSearch: (s: Record<string, unknown>): { accion?: "acta" | "cerrar" } =>
    s.accion === "acta" || s.accion === "cerrar" ? { accion: s.accion } : {},
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, INCLUSION_CRUMB, { label: "PIAR" }] },
  component: PiarFichaPage,
})
export const piarHistorialRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.piarHistorial.path,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, INCLUSION_CRUMB, { label: "Historial" }] },
  component: PiarHistorialPage,
})

export const observadorRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.observador.path,
  validateSearch: observadorSearchSchema,
  staticData: { breadcrumb: [GESTION_ESTUDIANTIL_CRUMB, { label: "Observador" }] },
  component: ObservadorPage,
})

const NuevaAnotacionPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/observador/pages/anotacion-form-page"),
  "NuevaAnotacionPage",
)

export const observadorNuevaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.observadorNueva.path,
  staticData: {
    breadcrumb: [
      GESTION_ESTUDIANTIL_CRUMB,
      { label: "Observador", to: paths.app.observador.getHref() },
      { label: "Nueva anotación" },
    ],
  },
  component: NuevaAnotacionPage,
})

const EditarAnotacionPage = lazyRouteComponent(
  () => import("@/features/gestion-estudiantil/observador/pages/anotacion-form-page"),
  "EditarAnotacionPage",
)

export const observadorEditarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.observadorEditar.path,
  staticData: {
    breadcrumb: [
      GESTION_ESTUDIANTIL_CRUMB,
      { label: "Observador", to: paths.app.observador.getHref() },
      { label: "Modificar anotación" },
    ],
  },
  component: EditarAnotacionPage,
})

const AsistenciaManualPage = lazyRouteComponent(
  () => import("@/features/academic-management/asistencia/pages/asistencia-manual-page"),
  "AsistenciaManualPage",
)

export const asistenciaManualRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.asistenciaManual.path,
  validateSearch: asistenciaManualSearchSchema,
  staticData: {
    breadcrumb: [
      GESTION_ACADEMICA_CRUMB,
      { label: "Asistencia", to: paths.app.asistencia.getHref() },
      { label: "Asistencia manual" },
    ],
  },
  component: AsistenciaManualPage,
})

const EspaciosPage = lazyRouteComponent(
  () => import("@/features/comunicaciones/espacios/pages/espacios-page"),
  "EspaciosPage",
)

const EspacioDetallePage = lazyRouteComponent(
  () => import("@/features/comunicaciones/espacios/pages/espacio-detalle-page"),
  "EspacioDetallePage",
)

export const espaciosRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.comunicacionesEspacios.path,
  staticData: {
    breadcrumb: [
      { label: "Gestión comunicaciones", to: paths.app.comunicacionesChat.getHref() },
      { label: "Espacios académicos" },
    ],
  },
  component: EspaciosPage,
})

export const espacioDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.comunicacionesEspacio.path,
  staticData: {
    breadcrumb: [
      { label: "Gestión comunicaciones", to: paths.app.comunicacionesChat.getHref() },
      { label: "Espacios académicos", to: paths.app.comunicacionesEspacios.getHref() },
      { label: "Espacio" },
    ],
  },
  component: EspacioDetallePage,
})

const ChatPage = lazyRouteComponent(
  () => import("@/features/comunicaciones/chat/pages/chat-page"),
  "ChatPage",
)

export const chatRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.comunicacionesChat.path,
  validateSearch: chatSearchSchema,
  staticData: {
    breadcrumb: [
      { label: "Gestión comunicaciones", to: paths.app.comunicacionesChat.getHref() },
      { label: "Chat" },
    ],
  },
  component: ChatPage,
})

export const comunicadosTerritorialRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.comunicacionesComunicadosTerritorial.path,
  staticData: {
    breadcrumb: [
      {
        label: "Comunicados institucionales",
        to: paths.app.comunicacionesComunicadosTerritorial.getHref(),
      },
    ],
  },
  component: lazyRouteComponent(
    () => import("@/features/comunicaciones/territorial/pages/comunicados-territorial-page"),
    "ComunicadosTerritorialPage",
  ),
})

export const comunicadoNuevoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.comunicacionesComunicadoNuevo.path,
  staticData: {
    breadcrumb: [
      { label: "Comunicados institucionales", to: paths.app.comunicacionesComunicados.getHref() },
      { label: "Nuevo comunicado", to: paths.app.comunicacionesComunicadoNuevo.getHref() },
    ],
  },
  component: lazyRouteComponent(
    () => import("@/features/comunicaciones/comunicados/pages/nuevo-comunicado-page"),
    "NuevoComunicadoPage",
  ),
})

// "Comunicados institucionales" (M.1.LIS.1 / M.1.REC.1): Publicados, Recibidos y Anteriores.
export const comunicadosRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.comunicacionesComunicados.path,
  validateSearch: comunicadosSearchSchema,
  staticData: {
    breadcrumb: [{ label: "Comunicados institucionales", to: paths.app.comunicacionesComunicados.getHref() }],
  },
  component: lazyRouteComponent(
    () => import("@/features/comunicaciones/comunicados/pages/comunicados-page"),
    "ComunicadosPage",
  ),
})

// Detalle y seguimiento (M.1.DET.1).
export const comunicadoDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.comunicacionesComunicadoDetalle.path,
  staticData: {
    breadcrumb: (params: Record<string, string>) => [
      { label: "Comunicados institucionales", to: paths.app.comunicacionesComunicados.getHref() },
      { label: "Detalle", to: paths.app.comunicacionesComunicadoDetalle.getHref(params.id) },
    ],
  },
  component: lazyRouteComponent(
    () => import("@/features/comunicaciones/comunicados/pages/comunicado-detalle-page"),
    "ComunicadoDetallePage",
  ),
})

// Modificar comunicado (M.1.EDI.1): solo el autor; título, mensaje y adjuntos.
export const comunicadoEditarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.comunicacionesComunicadoEditar.path,
  staticData: {
    breadcrumb: (params: Record<string, string>) => [
      { label: "Comunicados institucionales", to: paths.app.comunicacionesComunicados.getHref() },
      { label: "Modificar comunicado", to: paths.app.comunicacionesComunicadoEditar.getHref(params.id) },
    ],
  },
  component: lazyRouteComponent(
    () => import("@/features/comunicaciones/comunicados/pages/editar-comunicado-page"),
    "EditarComunicadoPage",
  ),
})

const ProcesosPage = lazyRouteComponent(() => import("@/features/comunicaciones/procesos/pages/procesos-page"), "ProcesosPage")

export const procesosRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.comunicacionesProcesos.path,
  staticData: {
    breadcrumb: [
      { label: "Gestión comunicaciones", to: paths.app.comunicacionesChat.getHref() },
      { label: "Procesos de postulación y elección", to: paths.app.comunicacionesProcesos.getHref() },
    ],
  },
  component: ProcesosPage,
})

const ProcesoDetallePage = lazyRouteComponent(() => import("@/features/comunicaciones/procesos/pages/proceso-detalle-page"), "ProcesoDetallePage")

export const procesoDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.comunicacionesProcesoDetalle.path,
  staticData: {
    breadcrumb: [
      { label: "Gestión comunicaciones", to: paths.app.comunicacionesChat.getHref() },
      { label: "Procesos de postulación y elección", to: paths.app.comunicacionesProcesos.getHref() },
      { label: "Detalle" },
    ],
  },
  component: ProcesoDetallePage,
})

const PendientesPage = lazyRouteComponent(() => import("@/features/offline/pages/pendientes-page"), "PendientesPage")

// Cambios guardados sin conexión (Fase 2 offline). Fuera del menú del backend:
// `isAlwaysAllowedPath` la deja pasar y se llega desde el header y el banner.
export const pendientesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.pendientes.path,
  validateSearch: pendientesSearchSchema,
  staticData: { breadcrumb: [{ label: "Cambios pendientes", to: paths.app.pendientes.getHref() }] },
  component: PendientesPage,
})

const SincronizarPage = lazyRouteComponent(() => import("@/features/offline/pages/sincronizar-page"), "SincronizarPage")

// "Sincronizar ahora" (offline de meses). Fuera del menú, como pendientes.
export const sincronizarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.sincronizar.path,
  staticData: { breadcrumb: [{ label: "Sincronizar ahora", to: paths.app.sincronizar.getHref() }] },
  component: SincronizarPage,
})

const MisDispositivosPage = lazyRouteComponent(
  () => import("@/features/devices/pages/mis-dispositivos-page"),
  "MisDispositivosPage",
)

// "Mis dispositivos" (credencial del equipo). Fuera del menú, como pendientes:
// se llega desde el menú de la cuenta. Solo en línea.
export const miCuentaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.miCuenta.path,
  staticData: { breadcrumb: [{ label: "Mi cuenta", to: paths.app.miCuenta.getHref() }] },
  component: lazyRouteComponent(() => import("@/features/cuenta/pages/mi-cuenta-page"), "MiCuentaPage"),
})

export const misDispositivosRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.misDispositivos.path,
  staticData: { breadcrumb: [{ label: "Mis dispositivos", to: paths.app.misDispositivos.getHref() }] },
  component: MisDispositivosPage,
})

const NotificacionesPage = lazyRouteComponent(
  () => import("@/features/notificaciones/pages/notificaciones-page"),
  "NotificacionesPage",
)

const NOTIFICACIONES_CRUMB = { label: "Notificaciones", to: paths.app.notificaciones.getHref() }

export const notificacionesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.notificaciones.path,
  validateSearch: notificacionesSearchSchema,
  staticData: { breadcrumb: [NOTIFICACIONES_CRUMB] },
  component: NotificacionesPage,
})

const PreferenciasNotificacionesPage = lazyRouteComponent(
  () => import("@/features/notificaciones/pages/preferencias-page"),
  "PreferenciasNotificacionesPage",
)

export const notificacionesPreferenciasRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.notificacionesPreferencias.path,
  staticData: {
    breadcrumb: [
      NOTIFICACIONES_CRUMB,
      { label: "Preferencias", to: paths.app.notificacionesPreferencias.getHref() },
    ],
  },
  component: PreferenciasNotificacionesPage,
})

const routeTree = rootRoute.addChildren([
  publicLayoutRoute.addChildren([
    homeRoute,
    verificarRoute,
    verificarBoletinRoute,
    inscribirRoute,
    consultarInscripcionRoute,
    confirmarCorreoRoute,
    noFuiYoRoute,
  ]),
  authLayoutRoute.addChildren([
    loginRoute,
    forgotPasswordRoute,
    verificacionRoute,
    configurarVerificacionRoute,
    elegirPerfilRoute,
    forgotUsernameRoute,
    checkEmailRoute,
    restorePasswordRoute,
    activateRoute,
  ]),
  appLayoutRoute.addChildren([
    appIndexRoute,
    sinAccesoRoute,
    coberturaReservaCupoRoute,
    coberturaPreMatriculaRoute,
    coberturaInscritosRoute,
    coberturaInscritoDetalleRoute,
    coberturaReservaDetalleRoute,
    coberturaReservaAsignarGrupoRoute,
    coberturaInscripcionDetalleRoute,
    coberturaInscripcionEditarRoute,
    coberturaInscripcionNuevaRoute,
    coberturaConfigGrupoRoute,
    coberturaConfigPeriodoRoute,
    coberturaMatriculaRoute,
    coberturaMatriculaAgregarRoute,
    coberturaMatriculaEditarRoute,
    coberturaMatriculaConfiguracionRoute,
    coberturaMatriculaDetalleRoute,
    auditsLayoutRoute.addChildren([
      auditoriaSesionesRoute,
      auditoriaTablasRoute,
      auditoriaTablaDetalleRoute,
      auditoriaSesionOperacionesRoute,
      bitacoraRoute,
    ]),
    rolesMenusRoute,
    listasValorRoute,
    areasOficialesRoute,
    criteriosPrioridadRoute,
    criterioPrioridadNuevoRoute,
    criterioPrioridadDetalleRoute,
    criterioPrioridadModificarRoute,
    superadministradoresRoute,
    supervisoresTerritorialesRoute,
    supervisorTerritorialNuevoRoute,
    supervisorTerritorialDetalleRoute,
    supervisorTerritorialModificarRoute,
    administradoresTerritorialesRoute,
    administradorTerritorialNuevoRoute,
    administradorTerritorialDetalleRoute,
    administradorTerritorialModificarRoute,
    parametrosEdadRoute,
    relacionesAlumnoGrupoRoute,
    festivosRoute,
    conservacionDatosRoute,
    conservacionPoliticaNuevaRoute,
    conservacionPoliticaEditarRoute,
    periodosAcademicosRoute,
    periodosAcademicosAgregarRoute,
    periodosAcademicosEditarRoute,
    periodosAcademicosVerRoute,
    periodosGradoAgregarRoute,
    periodosGradoEditarRoute,
    gestionAcademicaInformesRoute,
    planillaInformeRoute,
    gestionAcademicaReferentesCurricularesRoute,
    gestionAcademicaReferentesCurricularesDetalleRoute,
    establishmentLayoutRoute.addChildren([
      establishmentsRoute,
      campusesRoute,
      campusAddRoute,
      campusDetailRoute,
      campusEditRoute,
      employeesRoute,
      employeeAddRoute,
      employeeDetailRoute,
      employeeEditRoute,
      employeeRolesRoute,
      employeeRolePermissionsRoute,
      addEstablishmentRoute,
      establishmentDetailRoute,
      editEstablishmentRoute,
    ]),
    planeadorRoute,
    planeadorActividadCrearRoute,
    planeadorUnidadesRoute,
    planeadorUnidadCrearRoute,
    planeadorUnidadEditarRoute,
    planeadorActividadEditarRoute,
    planeadorRecursoPreviewRoute,
    planeadorPlanillaRoute,
    asistenciaRoute,
    catalogoAnotacionesRoute,
    inclusionOrientacionRoute,
    atencionNuevaRoute,
    atencionFichaRoute,
    piarNuevoRoute,
    piarFichaRoute,
    piarHistorialRoute,
    observadorRoute,
    observadorNuevaRoute,
    observadorEditarRoute,
    asistenciaManualRoute,
    convivenciaRoute,
    convivenciaNuevoRoute,
    convivenciaCasoRoute,
    convivenciaEditarRoute,
    convivenciaProcesoNuevoRoute,
    convivenciaProcesoRoute,
    convivenciaComiteIntegrantesRoute,
    convivenciaSesionNuevaRoute,
    convivenciaSesionRoute,
    convivenciaSesionEditarRoute,
    citacionesCompromisosRoute,
    citacionNuevaRoute,
    compromisoNuevoRoute,
    compromisoDetalleRoute,
    reconocimientosRoute,
    reconocimientoDetalleRoute,
    reintegracionRoute,
    reintegracionAbrirRoute,
    reintegracionCasoRoute,
    reintegracionConvivenciaRoute,
    prevencionRetencionRoute,
    prevencionHistorialRoute,
    prevencionValorarRoute,
    prevencionPlanNuevoRoute,
    prevencionPlanEditarRoute,
    prevencionPlanDetalleRoute,
    prevencionValoracionDetalleRoute,
    prevencionPlanCasoRoute,
    prevencionSaludMentalNuevoRoute,
    prevencionSenalSaludMentalRoute,
    prevencionEstrategiaNuevaRoute,
    prevencionEstrategiaEditarRoute,
    prevencionEstrategiaDetalleRoute,
    prevencionCaracterizacionRoute,
    prevencionCaracterizacionEditarRoute,
    prevencionHistorialAcademicoRoute,
    observacionesSugerenciasRoute,
    chatRoute,
    comunicadoNuevoRoute,
    comunicadosRoute,
    comunicadoDetalleRoute,
    comunicadoEditarRoute,
    comunicadosTerritorialRoute,
    procesosRoute,
    procesoDetalleRoute,
    espaciosRoute,
    espacioDetalleRoute,
    notificacionesRoute,
    pendientesRoute,
    sincronizarRoute,
    miCuentaRoute,
    misDispositivosRoute,
    notificacionesPreferenciasRoute,
  ]),
])

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultNotFoundComponent: NotFoundPage,
  defaultErrorComponent: ErrorPage,
  // Mensaje de carga si la navegación tarda más de 400 ms; una vez visible, mínimo 300 ms (sin parpadeo).
  defaultPendingComponent: PageLoading,
  defaultPendingMs: 400,
  defaultPendingMinMs: 300,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
