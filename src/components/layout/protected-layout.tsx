import { VaultGate } from "@/components/offline/vault-gate"
import { UpdateRequiredBanner } from "@/components/offline/update-required-banner"
import { StorageWarningBanner } from "@/components/offline/storage-warning-banner"
import { Outlet } from "@tanstack/react-router"

import { AppSidebar } from "@/features/navigation/components/app-sidebar"
import { NavUser } from "@/features/navigation/components/nav-user"
import { AssistantSheet } from "@/features/assistant/components/assistant-sheet"
import { getInitialSidebarOpen } from "@/features/navigation/lib/sidebar-cookie"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { CampanaNotificaciones } from "@/features/notificaciones/components/campana-notificaciones"
import { AppBreadcrumb } from "@/components/layout/app-breadcrumb"
import { OfflineBanner } from "@/components/layout/offline-banner"
import { HeaderSyncIndicator } from "@/features/offline/components/header-sync-indicator"
import { AutoPrepareRunner } from "@/features/offline/components/auto-prepare-runner"
import { FirstPrepareBanner } from "@/features/offline/components/first-prepare-banner"
import { OfflineDataStatus } from "@/features/offline/components/offline-data-status"
import { OnlineOnlyRouteGate } from "@/components/offline/online-only-route-gate"
import { ColorThemeToggle } from "@/components/color-theme-toggle"
import { ModeToggle } from "@/components/mode-toggle"

export function ProtectedLayout() {
  return (
    <SidebarProvider defaultOpen={getInitialSidebarOpen()}>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 bg-sidebar px-4">
          {/*
            En escritorio el trigger vive junto al logo, dentro del sidebar. En
            móvil no puede: ahí el sidebar es un `Sheet` cerrado, así que el
            botón que lo abre tiene que quedar fuera de él.
          */}
          <div className="flex items-center gap-2 md:hidden">
            <SidebarTrigger />
            <Separator orientation="vertical" className="my-auto h-4" />
          </div>

          <div className="flex min-w-0 flex-1 justify-center">
            <AppBreadcrumb />
          </div>

          {/*
            A 360 px los íconos no entraban (la página quedaba 100 px más ancha
            y se desplazaba a la derecha al abrir un menú o un diálogo). En
            móvil se ocultan los selectores de tema y se aprietan los espacios.
          */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <ModeToggle />
              <ColorThemeToggle />
            </div>
            <AssistantSheet />
            <Separator orientation="vertical" className="my-auto h-4" />
            <OfflineDataStatus />
            <HeaderSyncIndicator />
            <CampanaNotificaciones />
            <NavUser />
          </div>
        </header>
        <OfflineBanner />
        <FirstPrepareBanner />
        <AutoPrepareRunner />
        <UpdateRequiredBanner />
        <StorageWarningBanner />
        {/*
          `flex flex-col` para que la card de contenido de cada página pueda
          estirarse (`grow`) hasta el borde inferior cuando la tabla es corta.
          Sin esto quedaba una franja de `bg-sidebar` bajo la card.
        */}
        {/*
          El aire de la izquierda lo pone el sidebar mientras ocupa lugar. Bajo
          `md` se convierte en overlay y desaparece del flujo, así que ahí el
          contenedor tiene que poner su propio `pl-4` —si no, las cards quedan
          pegadas al borde de la pantalla—. El breakpoint es el mismo que usa
          `useIsMobile` (768px) para decidir el modo drawer.
        */}
        <div data-slot="app-content" className="flex min-w-0 flex-1 flex-col pr-4 pb-4 max-md:pl-4 bg-sidebar">
          <VaultGate>
            <OnlineOnlyRouteGate>
              <Outlet />
            </OnlineOnlyRouteGate>
          </VaultGate>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
