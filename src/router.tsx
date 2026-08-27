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
import { queryClient } from "@/lib/query-client"
import { NotFoundPage } from "@/components/layout/not-found-page"
import { ErrorPage } from "@/components/layout/error-page"
import { ComingSoonPage } from "@/components/layout/coming-soon-page"
import {
  checkEmailSearchSchema,
  loginSearchSchema,
  restorePasswordSearchSchema,
} from "@/features/auth/api/schema"
import {
  reservationsSearchSchema,
  preMatriculaSearchSchema,
  enrollmentsSearchSchema,
} from "@/features/coverage/api/schema"
import {
  auditsSearchSchema,
  auditTablesSearchSchema,
  sessionOperationsSearchSchema,
  tableOperationsSearchSchema,
} from "@/features/administration/audits/api/schema"
import { academicPeriodsSearchSchema } from "@/features/establishment/academic-period/api/schema"
import { establishmentsSearchSchema } from "@/features/establishment/institution/api/schema"
import { campusesSearchSchema } from "@/features/establishment/campuses/api/schema"
import { employeesSearchSchema } from "@/features/establishment/employees/api/schema"
import { NoticeProvider } from "@/components/notice/notice-context"
import {
  getFirstNavUrl,
  navItemsQueryOptions,
} from "@/features/navigation/api/query/use-nav-items-query"

/*const LandingPage = lazyRouteComponent(
  () => import("@/features/landing/pages/landing-page"),
  "LandingPage"
)*/
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
const AuthLayout = lazyRouteComponent(() => import("@/components/layout/auth-layout"), "AuthLayout")
const ProtectedLayout = lazyRouteComponent(
  () => import("@/components/layout/protected-layout"),
  "ProtectedLayout",
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

const AddEstablishmentPage = lazyRouteComponent(
  () => import("@/features/establishment/institution/pages/add-establishment-page"),
  "AddEstablishmentPage"
)

interface RouterContext {
  queryClient: QueryClient
}

const APP_NAME = "Colombia Evaluadora"
// const APP_DESCRIPTION = "Colombia Evaluadora: gestión de pagos con filtros, orden y paginación."
// const SITE_URL = env.APP_URL
// const OG_IMAGE = `${SITE_URL}/favicon.svg`

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  head: () => ({
    meta: [{ title: APP_NAME }],
  }),
})

/*
const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: paths.home.path,
  head: () => ({
    meta: [
      { title: APP_NAME },
      { name: "description", content: APP_DESCRIPTION },
      { property: "og:title", content: APP_NAME },
      { property: "og:description", content: APP_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: APP_NAME },
      { name: "twitter:description", content: APP_DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
  }),
  component: LandingPage,
})*/

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: paths.home.path,
  beforeLoad: () => {
    throw redirect({ to: paths.auth.login.path })
  },
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
    if (await hasSession(context.queryClient)) {
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

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: paths.app.root.path,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async ({ context, location }) => {
    if (!(await hasSession(context.queryClient))) {
      throw redirect({
        to: paths.auth.login.path,
        search: { redirectTo: location.href },
      })
    }
  },
  component: ProtectedLayout,
})

// Agrupadores sin página propia: enlazan a su primer hijo, igual que el grupo
// colapsable del sidebar (ver nav-main.tsx). Así toda miga es un `<a href>`
// navegable y la cadena del BreadcrumbList queda completa para Google.
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

// `/app` no tiene página propia: manda a la primera pantalla del menú del
// usuario (el primer item del sidebar), no a una ruta fija — hay roles sin
// Cobertura asignada, que caían en una pantalla que no les corresponde.
// Si el menú viene vacío o falla la llamada, Cobertura queda como último
// recurso: el layout protegido ya se encarga de la sesión.
const appIndexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/",
  beforeLoad: async ({ context }) => {
    let firstUrl: string | null = null
    try {
      const items = await context.queryClient.ensureQueryData(navItemsQueryOptions)
      firstUrl = getFirstNavUrl(items)
    } catch {
      firstUrl = null
    }

    throw redirect({ to: firstUrl ?? paths.app.coberturaReservaCupo.getHref() })
  },
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

const coberturaMatriculaRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.coberturaMatricula.path,
  staticData: { breadcrumb: [COBERTURA_CRUMB, { label: "Matrícula" }] },
  component: () => <ComingSoonPage title="Matrícula" />,
})

// Mismo criterio que `_establishment`: las cuatro vistas de auditoría
// comparten un `NoticeProvider` para que el aviso de una exportación o de un
// revert siga visible al moverse entre ellas.
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

// Ruta sin path propio: agrupa establecimientos/sedes/funcionarios bajo un
// único `NoticeProvider` para que un aviso disparado en un formulario de
// alta/edición siga visible al navegar de vuelta al listado (a diferencia de
// un provider por página, que se desmonta antes de que el usuario lo vea).
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
  staticData: {
    breadcrumb: [
      ESTABLECIMIENTO_CRUMB,
      { label: "Establecimiento", to: paths.app.establishments.general.getHref() },
      { label: "Agregar" },
    ],
  },
  component: AddEstablishmentPage,
})

export const editEstablishmentRoute = createRoute({
  getParentRoute: () => establishmentLayoutRoute,
  path: paths.app.establishments.edit.path,
  // El `establishmentId` es un identificador opaco: no se muestra como miga.
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
  // El `sessionId` es un identificador opaco: no se muestra como miga.
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
  staticData: {
    breadcrumb: [ESTABLECIMIENTO_CRUMB, PERIODOS_CRUMB, { label: "Agregar" }],
  },
  component: AcademicPeriodConfigPage,
})

export const periodosAcademicosEditarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.periodosAcademicosEditar.path,
  // El `periodId` es un identificador opaco: no se muestra como miga.
  staticData: {
    breadcrumb: [ESTABLECIMIENTO_CRUMB, PERIODOS_CRUMB, { label: "Editar" }],
  },
  component: AcademicPeriodConfigPage,
})

const routeTree = rootRoute.addChildren([
  //  landingRoute,
  homeRoute,
  authLayoutRoute.addChildren([
    loginRoute,
    forgotPasswordRoute,
    forgotUsernameRoute,
    checkEmailRoute,
    restorePasswordRoute,
  ]),
  appLayoutRoute.addChildren([
    appIndexRoute,
    coberturaReservaCupoRoute,
    coberturaPreMatriculaRoute,
    coberturaInscritosRoute,
    coberturaInscritoDetalleRoute,
    coberturaMatriculaRoute,
    auditsLayoutRoute.addChildren([
      auditoriaSesionesRoute,
      auditoriaTablasRoute,
      auditoriaTablaDetalleRoute,
      auditoriaSesionOperacionesRoute,
    ]),
    rolesMenusRoute,
    periodosAcademicosRoute,
    periodosAcademicosAgregarRoute,
    periodosAcademicosEditarRoute,
    establishmentsRoute,
    campusesRoute,
    employeesRoute,
    addEstablishmentRoute,
    editEstablishmentRoute,
    establishmentLayoutRoute.addChildren([
      establishmentsRoute,
      campusesRoute,
      employeesRoute,
      addEstablishmentRoute,
      editEstablishmentRoute,
    ]),
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
