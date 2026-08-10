import type { ReactNode } from "react"

import { NoticeOutlet } from "@/components/notice/notice-context"
import { cn } from "@/lib/utils"

/**
 * Andamiaje de las pantallas de listado: encabezado pegajoso (título + barra de
 * herramientas) y cuerpo con la tabla y su paginación.
 *
 * Son piezas que se COMPONEN por anidamiento, no un componente con props
 * `title`/`toolbar`/`actions`: las pantallas que se salen del molde (las de
 * auditoría llevan pestañas, roles y menús no lleva buscador) se resuelven
 * agregando o quitando piezas, sin banderas.
 *
 * No usa `Card`: la card es una superficie genérica y acá la estructura tiene
 * significado —encabezado de la página, título de la página, contenido—, así
 * que se marca con `<header>`, `<h1>` y `<section>`. Los estilos de superficie
 * (fondo, radio, anillo) van sueltos, copiados de `Card`.
 *
 * El `<main>` lo pone `SidebarInset` en `ProtectedLayout`, así que el `<h1>`
 * de cada pantalla ya cuelga de él; no hay que anidar otro.
 *
 * @example
 *   <TableScreen>
 *     <TableScreenHeader>
 *       <TableScreenTitle>Establecimiento educativo</TableScreenTitle>
 *       <TableScreenToolbar>
 *         <SearchEstablishments … />
 *         <TableScreenActions>{action}</TableScreenActions>
 *       </TableScreenToolbar>
 *     </TableScreenHeader>
 *     <TableScreenBody>
 *       <DataTable … />
 *       <Pagination … />
 *     </TableScreenBody>
 *   </TableScreen>
 */
function TableScreen({ children, className }: { children: ReactNode; className?: string }) {
  // `--screen-spacing` es el equivalente al `--card-spacing` de `Card`: lo
  // declara el contenedor y lo consumen las piezas para que el padding
  // horizontal sea el mismo en encabezado, pestañas y cuerpo.
  //
  // `flex-1 flex-col` replica el contenedor del layout para que el cuerpo
  // pueda estirarse (`grow`) hasta el borde inferior con tablas cortas.
  return (
    <section
      className={cn("flex min-w-0 flex-1 flex-col [--screen-spacing:--spacing(8)]", className)}
    >
      {children}
    </section>
  )
}

/**
 * Encabezado de la pantalla. Queda pegado bajo el header de la app (`top-14`
 * = su alto): el `bg-sidebar` opaco tapa lo que scrollea por debajo.
 *
 * Es su PROPIA superficie, separada del cuerpo. No se encapsulan en una sola:
 * si compartieran el `ring-1`, el borde inferior del encabezado se sumaría al
 * anillo y daría línea doble en el medio.
 */
function TableScreenHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header className={cn("sticky top-14 z-20 bg-sidebar", className)}>
      <div className="overflow-hidden rounded-t-lg bg-card text-sm text-card-foreground ring-1 ring-foreground/5 ring-inset">
        {children}
      </div>
    </header>
  )
}

/**
 * Título de la pantalla. Es el `<h1>` del documento: uno solo por página.
 *
 * `action` es para lo que acompaña al título en su misma línea (ej. el "Volver"
 * de las operaciones de auditoría). Las acciones sobre la tabla —agregar,
 * exportar— no van acá sino en `TableScreenActions`, junto al buscador.
 */
function TableScreenTitle({
  children,
  action,
  className,
}: {
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 bg-muted/10 px-(--screen-spacing) py-4",
        className,
      )}
    >
      <h1 className="font-heading text-2xl font-bold">{children}</h1>
      {action}
    </div>
  )
}

/**
 * Franja de pestañas entre el título y la barra de herramientas (las vistas de
 * auditoría). El contenido esperado es un `<nav>` con los enlaces.
 */
function TableScreenTabs({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("border-b border-border px-(--screen-spacing) pt-4", className)}>
      {children}
    </div>
  )
}

/**
 * Barra de herramientas: buscador a la izquierda, acciones a la derecha.
 *
 * `items-end` porque el buscador es más alto que los botones (lleva etiqueta
 * flotante) y todos tienen que compartir la línea base de abajo.
 *
 * Debajo va el `NoticeOutlet` de la pantalla: los avisos (errores de una
 * mutación, confirmaciones) salen siempre acá, entre la barra y la tabla.
 */
function TableScreenToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("px-(--screen-spacing) py-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">{children}</div>
      <NoticeOutlet className="mt-3" />
    </div>
  )
}

/** Bloque de acciones de la barra de herramientas (agregar, exportar, ...). */
function TableScreenActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex items-center gap-2", className)}>{children}</div>
}

/**
 * Cuerpo: la tabla y su paginación. `overflow-visible` para no romper el
 * sticky del encabezado; `rounded-t-none` para pegarse a su base plana.
 */
function TableScreenBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grow overflow-visible rounded-b-lg bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/5 ring-inset",
        className,
      )}
    >
      <div className="px-(--screen-spacing)">{children}</div>
    </div>
  )
}

export {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTabs,
  TableScreenTitle,
  TableScreenToolbar,
}
