import { Outlet } from "@tanstack/react-router"

import { AppSidebar } from "@/features/navigation/components/app-sidebar"
import { NavUser } from "@/features/navigation/components/nav-user"
import { AssistantSheet } from "@/features/assistant/components/assistant-sheet"
import { getInitialSidebarOpen } from "@/features/navigation/lib/sidebar-cookie"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { BellIcon } from "@/components/ui/icons"
import { AppBreadcrumb } from "./app-breadcrumb"
import { ColorThemeToggle } from "../color-theme-toggle"
import { ModeToggle } from "../mode-toggle"

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

          <div className="flex items-center gap-2">
            <ModeToggle />
            <ColorThemeToggle />
            <AssistantSheet />
            <Separator orientation="vertical" className="my-auto h-4" />
            <Button
              variant="outline"
              size="icon"
              color="muted"
              aria-label="Notificaciones"
              className="bg-background"
            >
              <BellIcon />
            </Button>
            <NavUser />
          </div>
        </header>
        {/*
          `flex flex-col` para que la card de contenido de cada página pueda
          estirarse (`grow`) hasta el borde inferior cuando la tabla es corta.
          Sin esto quedaba una franja de `bg-sidebar` bajo la card.
        */}
        <div className="flex min-w-0 flex-1 flex-col pr-4 pb-4 bg-sidebar">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}