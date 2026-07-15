import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router"

import { NotFoundPage } from "@/components/layout/not-found-page"
import { PaymentsPage } from "@/features/payments/pages/payments-page"
import { PaymentsErrorPage } from "@/features/payments/pages/payments-error-page"
import { paymentsSearchSchema } from "@/features/payments/api/schema"
import { ProtectedLayout } from "@/components/layout/protected-layout"
import { LandingPage } from "@/features/landing/pages/landing-page"
import { LoginPage } from "@/features/auth/pages/login-page"
import { loginSearchSchema } from "@/features/auth/api/schema"

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-svh">
      <Outlet />
    </div>
  ),
  notFoundComponent: () => (<NotFoundPage />),
})

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: loginSearchSchema,
  component: LoginPage,
})

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app",
  component: ProtectedLayout,
})

const appIndexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/",
  validateSearch: paymentsSearchSchema,
  component: PaymentsPage,
  errorComponent: PaymentsErrorPage,
})

const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  appLayoutRoute.addChildren([appIndexRoute]),
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
