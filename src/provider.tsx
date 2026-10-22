import { RouterContextProvider, Matches, HeadContent, Scripts } from "@tanstack/react-router"
import { QueryClientProvider } from "@tanstack/react-query"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/theme-provider"
import { startOfflineSupport } from "@/lib/auth"
import { queryClient } from "@/lib/query-client"
import { router } from "@/router"
import { prepareStore } from "@/features/offline/lib/prepare-engine"
// Handlers de la outbox (Fase 2 offline) y toast de resumen de cada lote.
import "@/features/offline/register-handlers"

// Persister de queries, snapshot de menú/permisos y reautenticación al volver
// la red (`lib/offline`). La restauración del cache del usuario la espera el
// guard de `/app` (`hasSession`), así ocurre antes de cualquier loader.
startOfflineSupport(queryClient)

// Solo en desarrollo: los E2E esperan a que una navegación termine de cargar
// (`__ceRouter.state.status`) y listan las queries sin datos sin red
// (`e2e/offline-sin-preparar.spec.ts`), y leen los números de la última
// preparación (`e2e/offline-prepare-incremental.spec.ts`). En el build de
// producción no existe.
if (import.meta.env.DEV && typeof window !== "undefined") {
  Object.assign(window, { __ceRouter: router, __ceQueryClient: queryClient, __cePrepare: prepareStore })
}

export function AppProvider() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <RouterContextProvider router={router}>
            <HeadContent />
            <Matches />
            <Scripts />
          </RouterContextProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
