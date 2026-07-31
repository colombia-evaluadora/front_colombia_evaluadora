import { Outlet } from "@tanstack/react-router"

import { AppSidebar } from "@/features/navigation/components/app-sidebar"
import { AssistantSheet } from "@/features/assistant/components/assistant-sheet"
import { getInitialSidebarOpen } from "@/features/navigation/lib/sidebar-cookie"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppBreadcrumb } from "./app-breadcrumb"
import { ColorThemeToggle } from "../color-theme-toggle"
import { ModeToggle } from "../mode-toggle"

export function ProtectedLayout() {
  return (
    <SidebarProvider defaultOpen={getInitialSidebarOpen()}>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="my-auto h-4" />
            <AppBreadcrumb />
          </div>

          <div className="flex gap-2">
            <ModeToggle />
            <ColorThemeToggle />
            <AssistantSheet />
          </div>
        </header>
        <div className="min-w-0 flex-1 p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
