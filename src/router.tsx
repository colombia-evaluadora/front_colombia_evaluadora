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
import {
  activateSearchSchema,
  checkEmailSearchSchema,
  loginSearchSchema,
  restorePasswordSearchSchema,
} from "@/features/auth/api/schema"
import {
  reservationsSearchSchema,
  preMatriculaSearchSchema,
  enrollmentsSearchSchema,
  matriculaSearchSchema,
} from "@/features/coverage/api/schema"
import {
  auditsSearchSchema,
  auditTablesSearchSchema,
  sessionOperationsSearchSchema,
  tableOperationsSearchSchema,
} from "@/features/administration/audits/api/schema"
import { academicPeriodsSearchSchema } from "@/features/establishment/academic-period/api/schema"
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
import { employeesSearchSchema } from "@/features/establishment/employees/api/schema"
import { curricularReferencesSearchSchema } from "@/features/academic-management/curricular-references/api/schema"
import {
  informesSearchSchema,
  planillaInformeSearchSchema,
} from "@/features/academic-management/reports/api/schema"
import {
  asistenciaManualSearchSchema,
  asistenciaSearchSchema,
  asistenciaSeguimientoSearchSchema,
} from "@/features/academic-management/asistencia/api/schema"
import { listasValorSearchSchema } from "@/features/administration/listas-valor/api/schema"
import { areasOficialesSearchSchema } from "@/features/administration/areas-oficiales/api/schema"
import { chatSearchSchema } from "@/features/comunicaciones/chat/api/schema"
import { forosSearchSchema } from "@/features/comunicaciones/foros/api/schema"
import { notificacionesSearchSchema } from "@/features/notificaciones/api/schema"
import { pendientesSearchSchema } from "@/features/offline/schema"
import { NoticeProvider } from "@/components/notice/notice-context"
import {
  getFirstNavUrl,
  navItemsQueryOptions,
} from "@/features/navigation/api/query/use-nav-items-query"
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
const ReservationsPage = lazyRouteComponent(
  () => import("@/features/coverage/pages/reservations-page"),
  "ReservationsPage",
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
const EstablishmentsPage = lazyRouteComponent(
  () => import("@/features/establishment/institution/pages/establishments-page"),
  "EstablishmentsPage"
)

const CampusesPage = lazyRouteComponent(
  () => import("@/features/establishment/campuses/pages/campuses-page"),
  "CampusesPage"
)

const EmployeesPage = lazyRouteComponent(
  () => import("@/features/establishment/employees/pages/employees-page"),
  "EmployeesPage"
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
const ParametrosEdadPage = lazyRouteComponent(
  () => import("@/features/administration/parametros-edad/pages/parametros-edad-page"),
  "ParametrosEdadPage"
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
  () => import("@/features/coverage/pages/matricula-page"),
  "MatriculaPage",
)

const AddMatriculaPage = lazyRouteComponent(
  () => import("@/features/coverage/pages/add-matricula-page"),
  "AddMatriculaPage",
)

const MatriculaDetailPage = lazyRouteComponent(
  () => import("@/features/coverage/pages/matricula-detail-page"),
  "MatriculaDetailPage",
)

const MatriculaEditPage = lazyRouteComponent(
  () => import("@/features/coverage/pages/matricula-edit-page"),
  "MatriculaEditPage",
)

const MatriculaFieldConfigPage = lazyRouteComponent(
  () => import("@/features/coverage/pages/matricula-field-config-page"),
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

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: paths.home.path,
  beforeLoad: () => {
    throw redirect({ to: paths.auth.login.path })
  },
})

// Pública (QR del boletín): sin sesión ni layout de la app.
export const verificarBoletinRoute = createRoute({
  getParentRoute: () => rootRoute,
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
  to: paths.app.coberturaReservaCupo.getHref(),
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
const PERIODOS_CRUMB = {
  label: "Periodos académicos",
  to: paths.app.periodosAcademicos.getHref(),
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
    const items = await context.queryClient.ensureQueryData(navItemsQueryOptions)
    throw redirect({ to: getFirstNavUrl(items) ?? paths.app.sinAcceso.getHref() })
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

export const coberturaReservaCupoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaReservaCupo.path,
  validateSearch: reservationsSearchSchema,
  staticData: { breadcrumb: [COBERTURA_CRUMB, { label: "Reserva de cupo" }] },
  component: ReservationsPage,
})

const PreMatriculaPage = lazyRouteComponent(
  () => import("@/features/coverage/pages/pre-matricula-page"),
  "PreMatriculaPage"
)

export const coberturaPreMatriculaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaPreMatricula.path,
  validateSearch: preMatriculaSearchSchema,
  staticData: { breadcrumb: [COBERTURA_CRUMB, { label: "Pre-Matrícula" }] },
  component: PreMatriculaPage,
})

const EnrollmentsPage = lazyRouteComponent(
  () => import("@/features/coverage/pages/enrollments-page"),
  "EnrollmentsPage",
)

export const coberturaInscritosRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaInscritos.path,
  validateSearch: enrollmentsSearchSchema,
  staticData: { breadcrumb: [COBERTURA_CRUMB, { label: "Inscritos" }] },
  component: EnrollmentsPage,
})

const EnrollmentDetailPage = lazyRouteComponent(
  () => import("@/features/coverage/pages/enrollment-detail-page"),
  "EnrollmentDetailPage",
)

export const coberturaInscritoDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaInscritoDetalle.path,
  staticData: {
    breadcrumb: () => [
      COBERTURA_CRUMB,
      { label: "Inscritos", to: paths.app.coberturaInscritos.getHref() },
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

export const parametrosEdadRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.parametrosEdad.path,
  staticData: {
    breadcrumb: [ADMINISTRACION_CRUMB, { label: "Parámetros de edad" }],
  },
  component: ParametrosEdadPage,
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

export const employeesRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.officials.path,
  validateSearch: employeesSearchSchema,
  staticData: { breadcrumb: [ESTABLECIMIENTO_CRUMB, { label: "Funcionarios" }] },
  component: EmployeesPage,
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

export const periodosAcademicosEditarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.periodosAcademicosEditar.path,
  validateSearch: academicPeriodsSearchSchema,
  staticData: {
    breadcrumb: [ESTABLECIMIENTO_CRUMB, PERIODOS_CRUMB, { label: "Editar" }],
  },
  component: AcademicPeriodConfigPage,
})

const ReportsPage = lazyRouteComponent(
  () => import("@/features/academic-management/pages/reports-page"),
  "ReportsPage",
)
const PlanillaInformePage = lazyRouteComponent(
  () => import("@/features/academic-management/reports/pages/planilla-informe-page"),
  "PlanillaInformePage",
)
const CurricularReferencesPage = lazyRouteComponent(
  () => import("@/features/academic-management/pages/curricular-references-page"),
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

const SeguimientoPage = lazyRouteComponent(
  () => import("@/features/academic-management/asistencia/pages/seguimiento-page"),
  "SeguimientoPage",
)

export const asistenciaSeguimientoRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.asistenciaSeguimiento.path,
  validateSearch: asistenciaSeguimientoSearchSchema,
  staticData: {
    breadcrumb: [
      GESTION_ACADEMICA_CRUMB,
      { label: "Asistencia", to: paths.app.asistencia.getHref() },
      { label: "Seguimiento" },
    ],
  },
  component: SeguimientoPage,
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

const ForosPage = lazyRouteComponent(() => import("@/features/comunicaciones/foros/pages/foros-page"), "ForosPage")

// Foros (publicaciones con hilos) sobre canales FORO de comms-service. Menú FOROS (sso V586).
export const forosRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.comunicacionesForos.path,
  validateSearch: forosSearchSchema,
  staticData: {
    breadcrumb: [
      { label: "Gestión comunicaciones", to: paths.app.comunicacionesChat.getHref() },
      { label: "Foros", to: paths.app.comunicacionesForos.getHref() },
    ],
  },
  component: ForosPage,
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
  homeRoute,
  verificarBoletinRoute,
  authLayoutRoute.addChildren([
    loginRoute,
    forgotPasswordRoute,
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
    ]),
    rolesMenusRoute,
    listasValorRoute,
    areasOficialesRoute,
    parametrosEdadRoute,
    periodosAcademicosRoute,
    periodosAcademicosAgregarRoute,
    periodosAcademicosEditarRoute,
    gestionAcademicaInformesRoute,
    planillaInformeRoute,
    gestionAcademicaReferentesCurricularesRoute,
    gestionAcademicaReferentesCurricularesDetalleRoute,
    establishmentLayoutRoute.addChildren([
      establishmentsRoute,
      campusesRoute,
      employeesRoute,
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
    asistenciaSeguimientoRoute,
    asistenciaManualRoute,
    chatRoute,
    forosRoute,
    notificacionesRoute,
    pendientesRoute,
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
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
