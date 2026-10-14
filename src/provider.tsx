import { RouterContextProvider, Matches, HeadContent, Scripts } from "@tanstack/react-router"
import { QueryClientProvider } from "@tanstack/react-query"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/theme-provider"
import { startOfflineSupport } from "@/lib/auth"
import { queryClient } from "@/lib/query-client"
import { router } from "@/router"

// Persister de queries, snapshot de menú/permisos y reautenticación al volver
// la red (`lib/offline`). La restauración del cache del usuario la espera el
// guard de `/app` (`hasSession`), así ocurre antes de cualquier loader.
startOfflineSupport(queryClient)

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
