import { useState } from "react"

import { Link, useLocation } from "@tanstack/react-router"
import { CaretRightIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

import { useNavItemsQuery } from "@/features/navigation/api/query/use-nav-items-query"
import type { NavSubItem } from "@/features/navigation/api/types/nav-item"
import type { Icon } from "@phosphor-icons/react"

export function NavMain() {
  const { data: items, isPending, isError, refetch } = useNavItemsQuery()
  const { pathname } = useLocation()

  if (isPending) {
    return (
      <SidebarGroup>
        <SidebarMenu>
          {Array.from({ length: 3 }).map((_, i) => (
            <SidebarMenuItem key={i}>
              <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  if (isError) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1.5 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
          Ocurrió un error al cargar el menú.{" "}
          <Button variant="link" className="h-auto p-0" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items?.map((item) => {
          const isActive = pathname === item.url

          if (!item.items?.length) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip={item.title}
                  render={<Link to={item.url} />}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          return (
            <NavCollapsibleItem
              key={item.title}
              title={item.title}
              icon={item.icon}
              items={item.items}
              isActive={isActive}
              pathname={pathname}
            />
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

interface NavCollapsibleItemProps {
  title: string
  icon: Icon
  items: NavSubItem[]
  isActive: boolean
  pathname: string
}

/**
 * Its own component (not inlined in the `.map` above) so `defaultOpen` can
 * be seeded once via a lazy `useState` initializer, evaluated only at mount.
 * Passing a value recomputed from `pathname` directly as `defaultOpen` on
 * every render made Base UI's Collapsible warn about changing an
 * uncontrolled component's default state after init, since `NavMain`
 * re-renders (recomputing `isActive`/`isSubActive`) on every route change.
 */
function NavCollapsibleItem({
  title,
  icon: Icon,
  items,
  isActive,
  pathname,
}: NavCollapsibleItemProps) {
  const hasActiveChild = items.some((sub) => sub.url === pathname)
  const [defaultOpen] = useState(() => isActive || hasActiveChild)

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="group/collapsible"
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={
          <SidebarMenuButton
            tooltip={title}
            /**
             * Collapsed to icons the sub-items are hidden, so the parent icon
             * has to carry the active state itself. Expanded, the highlighted
             * sub-item already shows it — hence the icon-mode-only classes.
             */
            className={cn(
              (isActive || hasActiveChild) &&
                "group-data-[collapsible=icon]:bg-sidebar-accent group-data-[collapsible=icon]:font-medium group-data-[collapsible=icon]:text-sidebar-accent-foreground"
            )}
            render={<Link to={items[0].url} />}
          />
        }
      >
        <Icon />
        <span>{title}</span>
        <CaretRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {items.map((sub) => (
            <SidebarMenuSubItem key={sub.url}>
              <SidebarMenuSubButton
                isActive={pathname === sub.url}
                render={<Link to={sub.url} />}
              >
                <span>{sub.title}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}
