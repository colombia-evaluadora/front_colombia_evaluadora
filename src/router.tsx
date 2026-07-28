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
import { paymentsSearchSchema } from "@/features/payments/api/schema"
import { PaymentsErrorPage } from "@/features/payments/pages/payments-error-page"
import {
  auditsSearchSchema,
  auditTablesSearchSchema,
  sessionOperationsSearchSchema,
  tableOperationsSearchSchema,
} from "@/features/audits/api/schema"
import { establishmentsSearchSchema } from "@/features/establishment/api/establishment-schema"
import { campusesSearchSchema } from "@/features/establishment/api/campus-schema"

/*const LandingPage = lazyRouteComponent(
  () => import("@/features/landing/pages/landing-page"),
  "LandingPage"
)*/
const LoginPage = lazyRouteComponent(
  () => import("@/features/auth/pages/login-page"),
  "LoginPage"
)
const ForgotPasswordPage = lazyRouteComponent(
  () => import("@/features/auth/pages/forgot-password-page"),
  "ForgotPasswordPage"
)
const ForgotUsernamePage = lazyRouteComponent(
  () => import("@/features/auth/pages/forgot-username-page"),
  "ForgotUsernamePage"
)
const CheckEmailPage = lazyRouteComponent(
  () => import("@/features/auth/pages/check-email-page"),
  "CheckEmailPage"
)
const RestorePasswordPage = lazyRouteComponent(
  () => import("@/features/auth/pages/restore-password-page"),
  "RestorePasswordPage"
)
const AuthLayout = lazyRouteComponent(
  () => import("@/components/layout/auth-layout"),
  "AuthLayout"
)
const ProtectedLayout = lazyRouteComponent(
  () => import("@/components/layout/protected-layout"),
  "ProtectedLayout"
)
const PaymentsPage = lazyRouteComponent(
  () => import("@/features/payments/pages/payments-page"),
  "PaymentsPage"
)
const AuditSessionPage = lazyRouteComponent(
  () => import("@/features/audits/pages/audit-session-page"),
  "AuditSessionPage"
)
const AuditTablesPage = lazyRouteComponent(
  () => import("@/features/audits/pages/audit-tables-page"),
  "AuditTablesPage"
)
const TableOperationsPage = lazyRouteComponent(
  () => import("@/features/audits/pages/table-operations-page"),
  "TableOperationsPage"
)
const SessionOperationsPage = lazyRouteComponent(
  () => import("@/features/audits/pages/session-operations-page"),
  "SessionOperationsPage"
)
const EstablishmentsPage = lazyRouteComponent(
  () => import("@/features/establishment/pages/establishments-page"),
  "EstablishmentsPage"
)

const CampusesPage = lazyRouteComponent(
  () => import("@/features/establishment/pages/campuses-page"),
  "CampusesPage"
)

const AddEstablishmentPage = lazyRouteComponent(
  () => import("@/features/establishment/pages/add-establishment-page"),
  "AddEstablishmentPage"
)

const AddCampusPage = lazyRouteComponent(
  () => import("@/features/establishment/pages/add-campus-page"),
  "AddCampusPage"
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

export const paymentsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.payments.path,
  validateSearch: paymentsSearchSchema,
  errorComponent: PaymentsErrorPage,
  component: PaymentsPage,
})

export const auditoriaSesionesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.auditoriaSesiones.path,
  validateSearch: auditsSearchSchema,
  component: AuditSessionPage,
})

export const auditoriaTablasRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.auditoriaTablas.path,
  validateSearch: auditTablesSearchSchema,
  component: AuditTablesPage,
})

export const auditoriaTablaDetalleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.auditoriaTablaDetalle.path,
  validateSearch: tableOperationsSearchSchema,
  component: TableOperationsPage,
})

export const establishmentsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.establishments.general.path,
  validateSearch: establishmentsSearchSchema,
  component: EstablishmentsPage,
})

export const campusesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.establishments.campuses.path,
  validateSearch: campusesSearchSchema,
  component: CampusesPage,
})

export const addEstablishmentRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.establishments.add.path,
  component: AddEstablishmentPage,
})

export const editEstablishmentRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.establishments.edit.path,
  component: AddEstablishmentPage,
})

export const addCampusRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.establishments.campuses.add.path,
  component: AddCampusPage,
})

export const editCampusRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.establishments.campuses.edit.path,
  component: AddCampusPage,
})

export const auditoriaSesionOperacionesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.auditoriaSesionOperaciones.path,
  validateSearch: sessionOperationsSearchSchema,
  component: SessionOperationsPage,
})

const reportesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.reportes.path,
  component: () => <ComingSoonPage title="Reportes" />,
})

const usuariosRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.usuarios.path,
  component: () => <ComingSoonPage title="Usuarios" />,
})

const configuracionRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: paths.app.configuracion.path,
  component: () => <ComingSoonPage title="Configuración" />,
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
    paymentsRoute,
    auditoriaSesionesRoute,
    auditoriaTablasRoute,
    auditoriaTablaDetalleRoute,
    auditoriaSesionOperacionesRoute,
    establishmentsRoute,
    campusesRoute,
    addEstablishmentRoute,
    editEstablishmentRoute,
    addCampusRoute,
    editCampusRoute,
    reportesRoute,
    usuariosRoute,
    configuracionRoute,
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
