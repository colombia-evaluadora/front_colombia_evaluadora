import { Link } from "@tanstack/react-router"

import icon from "@/assets/icon.svg"
import logo from "@/assets/logo.svg"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { NavMain } from "./nav-main"

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/app" />}>
              <img
                src={icon}
                alt="Colombia Evaluadora"
                className="hidden size-8 shrink-0 rounded-lg group-data-[collapsible=icon]:block"
              />
              <img
                src={logo}
                alt="Colombia Evaluadora"
                className="h-10 w-auto group-data-[collapsible=icon]:hidden"
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
    </Sidebar>
  )
}