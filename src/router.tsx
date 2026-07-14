import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  Link,
} from "@tanstack/react-router"

import { PaymentsPage } from "@/features/payments/pages/payments-page"
import { PaymentsErrorPage } from "@/features/payments/pages/payments-error-page"
import { paymentsSearchSchema } from "@/features/payments/api/schema"

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-svh">
      <Outlet />
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <Link to="/app" className="text-primary underline">
        Ir a pagos
      </Link>
    </div>
  ),
})

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app",
  component: () => <Outlet />,
})

const appIndexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/",
  validateSearch: paymentsSearchSchema,
  component: PaymentsPage,
  errorComponent: PaymentsErrorPage,
})

const routeTree = rootRoute.addChildren([appLayoutRoute.addChildren([appIndexRoute])])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
