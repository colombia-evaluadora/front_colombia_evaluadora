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
import { env } from "@/config/env"
import { hasSession } from "@/lib/auth"
import { queryClient } from "@/lib/query-client"
import { NotFoundPage } from "@/components/layout/not-found-page"
import { ErrorPage } from "@/components/layout/error-page"
import { ComingSoonPage } from "@/components/layout/coming-soon-page"
import {
  loginSearchSchema,
  restorePasswordSearchSchema,
} from "@/features/auth/api/schema"
import { paymentsSearchSchema } from "@/features/payments/api/schema"
import { PaymentsErrorPage } from "@/features/payments/pages/payments-error-page"

const LandingPage = lazyRouteComponent(
  () => import("@/features/landing/pages/landing-page"),
  "LandingPage"
)
const LoginPage = lazyRouteComponent(
  () => import("@/features/auth/pages/login-page"),
  "LoginPage"
)
const ForgotPasswordPage = lazyRouteComponent(
  () => import("@/features/auth/pages/forgot-password-page"),
  "ForgotPasswordPage"
)
const RestorePasswordPage = lazyRouteComponent(
  () => import("@/features/auth/pages/restore-password-page"),
  "RestorePasswordPage"
)
const ProtectedLayout = lazyRouteComponent(
  () => import("@/components/layout/protected-layout"),
  "ProtectedLayout"
)
const PaymentsPage = lazyRouteComponent(
  () => import("@/features/payments/pages/payments-page"),
  "PaymentsPage"
)

interface RouterContext {
  queryClient: QueryClient
}

const APP_NAME = "Colombia Evaluadora"
const APP_DESCRIPTION = "Colombia Evaluadora: gestión de pagos con filtros, orden y paginación."
const SITE_URL = env.APP_URL
const OG_IMAGE = `${SITE_URL}/favicon.svg`

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  head: () => ({
    meta: [{ title: APP_NAME }],
  }),
})

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
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
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
  getParentRoute: () => rootRoute,
  path: paths.auth.forgotPassword.path,
  head: () => ({
    meta: [
      { title: `Recuperar contraseña · ${APP_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ForgotPasswordPage,
})

const restorePasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
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
  landingRoute,
  loginRoute,
  forgotPasswordRoute,
  restorePasswordRoute,
  appLayoutRoute.addChildren([
    paymentsRoute,
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
