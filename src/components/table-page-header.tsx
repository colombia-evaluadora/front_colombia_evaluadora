import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface TablePageHeaderProps {
  title: ReactNode
  description?: ReactNode
  // Acción que acompaña al título (ej. navegación "Volver"). Las acciones
  // sobre los datos —"Agregar", exportar, columnas— no van acá sino en la
  // barra de herramientas.
  action?: ReactNode
  // Barra de herramientas de la tabla (buscador + acciones). Va bajo el
  // título, dentro de la misma sección, para que todo se pegue junto al
  // hacer scroll.
  children?: ReactNode
  className?: string
}

/**
 * Encabezado de las páginas de tabla: título, descripción y barra de
 * herramientas en una sección propia y `sticky`, separada del cuerpo que
 * scrollea.
 *
 * Dos condiciones para que el `sticky` funcione:
 *  - `top-14` es exactamente el alto del header de la app
 *    (`protected-layout`), que también es sticky; sin ese offset la sección
 *    se metería debajo. El `z-20` la deja por debajo de ese header (z-40).
 *  - Ningún ancestro puede tener `overflow-hidden` —el `Card` lo trae por
 *    defecto—, así que las páginas que usan esto pasan `overflow-visible`.
 */
export function TablePageHeader({
  title,
  description,
  action,
  children,
  className,
}: TablePageHeaderProps) {
  return (
    <section
      data-slot="table-page-header"
      className={cn(
        // `-mt` cancela el padding superior del Card y `pt` lo repone dentro
        // de la sección: así lo que se pega incluye ese espacio y nada asoma
        // por encima. `rounded-t-[inherit]` respeta las esquinas del Card,
        // que ya no puede recortarlas por sí mismo.
        "sticky top-14 z-20 -mt-(--card-spacing) rounded-t-[inherit] border-b border-border bg-card px-(--card-spacing) pt-(--card-spacing) pb-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-heading text-xl font-bold">{title}</div>
          {description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  )
}
