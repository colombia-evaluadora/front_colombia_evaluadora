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
        {/*
          Header en tres franjas: trigger a la izquierda, breadcrumbs en el
          centro, acciones a la derecha. La franja central usa `flex-1` para
          comerse el espacio sobrante y `justify-center` para mantener el
          rastro centrado aunque el breadcrumb sea corto (un solo ítem) o
          largo (varios ítems sin envolver).
        */}
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-sidebar px-4">
          <div className="flex items-center gap-2">
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
        <div className="min-w-0 flex-1 p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}