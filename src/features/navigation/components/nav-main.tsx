import { useState } from "react"

import { Link, useLocation } from "@tanstack/react-router"
import { CaretRightIcon } from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
import type { NavMaxLines, NavSubItem } from "@/features/navigation/api/types/nav-item"
import type { Icon } from "@/components/ui/icons"

/**
 * `maxLines` viene de la API (ver `NavMaxLines`): cuántas líneas se ven de la
 * etiqueta antes de cortarla con "…". El mapa es explícito porque Tailwind
 * necesita las clases literales en el código —un `line-clamp-${n}` armado en
 * runtime no se genera—.
 *
 * Sin valor se asume 1: la gran mayoría de los títulos caben en una línea, así
 * que solo los que necesitan más lo piden explícitamente desde la API. `0`
 * desactiva el corte y deja el título completo, ocupe las líneas que ocupe.
 */
const LINE_CLAMP: Record<NavMaxLines, string> = {
  0: "",
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
}

function lineClamp(maxLines: NavMaxLines = 1) {
  return LINE_CLAMP[maxLines]
}

export function NavMain() {
  const { data: items, isPending, isError, refetch } = useNavItemsQuery()
  const { pathname } = useLocation()

  /**
   * Acordeón: un único grupo abierto a la vez. El estado vive aquí (no en cada
   * `NavCollapsibleItem`) para que abrir uno pueda cerrar los demás. Se siembra
   * con el grupo que contiene la ruta actual, y solo una vez que los items han
   * cargado — de ahí el `??` en lugar de un `useState` con initializer, que se
   * evaluaría cuando `items` aún es `undefined`.
   */
  const [openTitle, setOpenTitle] = useState<string | null | undefined>(undefined)
  const activeTitle =
    openTitle !== undefined
      ? openTitle
      : (items?.find(
          (item) => item.url === pathname || item.items?.some((sub) => sub.url === pathname),
        )?.title ?? null)

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
                  <span className={lineClamp(item.maxLines)}>{item.title}</span>
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
              maxLines={item.maxLines}
              isActive={isActive}
              pathname={pathname}
              open={activeTitle === item.title}
              onOpenChange={(open) => setOpenTitle(open ? item.title : null)}
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
  maxLines?: NavMaxLines
  isActive: boolean
  pathname: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Controlado desde `NavMain` para el comportamiento de acordeón. Sigue siendo
 * su propio componente para mantener legible el `.map` de arriba.
 */
function NavCollapsibleItem({
  title,
  icon: Icon,
  items,
  maxLines,
  isActive,
  pathname,
  open,
  onOpenChange,
}: NavCollapsibleItemProps) {
  const hasActiveChild = items.some((sub) => sub.url === pathname)

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="group/collapsible"
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={
          <SidebarMenuButton
            tooltip={title}
            /**
             * La carpeta se pinta con los colores primarios (fondo + texto
             * invertido) cuando ella misma es la ruta activa **o** alguno de
             * sus hijos lo es — así el padre comunica el contexto aunque el
             * sub-item activo cargue con su propio indicador (el punto •).
             *
             * Se aplica en ambos modos (expandido y colapsado a iconos)
             * porque la pista visual tiene que sobrevivir al colapso, donde
             * los sub-items desaparecen. Los `!` fuerzan las variantes de
             * hover/active del cva para que el fondo no salte a
             * `sidebar-accent` al pasar el cursor.
             */
            className={cn(
              (isActive || hasActiveChild) &&
                "bg-primary text-primary-foreground font-medium hover:!bg-primary/90 hover:!text-primary-foreground active:!bg-primary/80 active:!text-primary-foreground data-open:hover:!bg-primary/90 data-open:hover:!text-primary-foreground",
            )}
            render={<Link to={items[0].url} />}
          />
        }
      >
        <Icon />
        <span className={lineClamp(maxLines)}>{title}</span>
        <CaretRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {items.map((sub) => (
            <SidebarMenuSubItem key={sub.url}>
              <SidebarMenuSubButton isActive={pathname === sub.url} render={<Link to={sub.url} />}>
                <span className={lineClamp(sub.maxLines)}>{sub.title}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}
