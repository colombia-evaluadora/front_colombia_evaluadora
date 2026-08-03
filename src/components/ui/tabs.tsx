import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center p-1 text-muted-foreground group-data-horizontal/tabs:h-10 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
        // Pestañas tipo carpeta. La lista es dueña del marco exterior (borde
        // superior + laterales) y del redondeo, que recorta a las hijas para que
        // la primera y la última salgan curvas. El borde inferior lo dibuja cada
        // pestaña, para que la activa pueda borrarlo y fundirse con el panel.
        // El -mb-2 cancela el gap-2 del root y deja ambos bordes coincidiendo.
        folder:
          "relative z-10 -mb-2 w-full flex-nowrap items-stretch justify-start gap-0 overflow-hidden rounded-t-lg border border-b-0 border-border bg-transparent p-0 group-data-horizontal/tabs:h-auto",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-2 border border-transparent px-4 py-1.5 text-xs font-semibold tracking-wider whitespace-nowrap text-foreground/60 uppercase transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:px-4 group-data-vertical/tabs:py-2 hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        // Cada pestaña dibuja solo dos líneas: el separador izquierdo (salvo la
        // primera) y el borde inferior contra el panel. El marco exterior es de la
        // lista, así ninguna línea se duplica ni queda un lado sin cerrar.
        "group-data-[variant=folder]/tabs-list:h-auto group-data-[variant=folder]/tabs-list:rounded-none group-data-[variant=folder]/tabs-list:border-0 group-data-[variant=folder]/tabs-list:border-b group-data-[variant=folder]/tabs-list:border-l group-data-[variant=folder]/tabs-list:first:border-l-0 group-data-[variant=folder]/tabs-list:border-border group-data-[variant=folder]/tabs-list:bg-muted/60 group-data-[variant=folder]/tabs-list:px-4 group-data-[variant=folder]/tabs-list:py-2.5 group-data-[variant=folder]/tabs-list:text-xs group-data-[variant=folder]/tabs-list:tracking-normal group-data-[variant=folder]/tabs-list:normal-case",
        // Las inactivas reparten el ancho sobrante (flex-auto) y recortan con "…"
        // si falta espacio; la activa pasa a flex-none para reservar su ancho
        // completo y mostrar siempre la etiqueta entera.
        // El display block es lo que habilita el text-ellipsis (en un flex no aplica).
        "group-data-[variant=folder]/tabs-list:block group-data-[variant=folder]/tabs-list:min-w-16 group-data-[variant=folder]/tabs-list:flex-auto group-data-[variant=folder]/tabs-list:truncate group-data-[variant=folder]/tabs-list:text-center",
        // La activa borra su borde inferior para fundirse con el panel (que va sin
        // borde superior) y queda en blanco.
        "group-data-[variant=folder]/tabs-list:data-active:flex-none group-data-[variant=folder]/tabs-list:data-active:border-b-transparent group-data-[variant=folder]/tabs-list:data-active:bg-background dark:group-data-[variant=folder]/tabs-list:data-active:border-b-transparent dark:group-data-[variant=folder]/tabs-list:data-active:bg-background",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
