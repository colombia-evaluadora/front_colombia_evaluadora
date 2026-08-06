import { Link } from "@tanstack/react-router"

import icon from "@/assets/icon.svg"
import logo from "@/assets/logo.svg"
import { Sidebar, SidebarContent, SidebarHeader, SidebarTrigger } from "@/components/ui/sidebar"

import { NavMain } from "./nav-main"

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="pt-4">
        {/*
          El logo es un enlace pelado, no un `SidebarMenuButton`: no es una
          opción del menú, así que no debe pintarse de `sidebar-accent` al pasar
          el puntero ni comportarse como seleccionable.

          Plegado a iconos el rail solo da para una cosa (3rem), y esa cosa es
          la marca: el logo se cambia por el isotipo y el trigger se esconde.
          Para volver a desplegar está el peek —al pasar el puntero el sidebar
          asoma y con él reaparece el botón—, que es el mismo gesto con el que
          ya se navega el menú plegado.
        */}
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Link to="/app" className="min-w-0">
            <img
              src={icon}
              alt="Colombia Evaluadora"
              className="hidden size-8 shrink-0 rounded-lg group-data-[collapsible=icon]:block"
            />
            <img
              src={logo}
              alt="Colombia Evaluadora"
              className="h-13 w-auto shrink-0 group-data-[collapsible=icon]:hidden"
            />
          </Link>
          <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
    </Sidebar>
  )
}
