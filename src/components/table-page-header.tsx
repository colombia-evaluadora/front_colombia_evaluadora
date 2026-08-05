import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface TablePageHeaderProps {
  title: ReactNode
  description?: ReactNode
  // Acción que acompaña al título (ej. navegación "Volver"). Las acciones
  // sobre los datos —"Agregar", exportar, columnas— no van acá sino en la
  // barra de herramientas.
  action?: ReactNode
  // Pestañas de navegación entre vistas de la misma página. Van bajo el
  // título y a sangre —de borde a borde de la tarjeta—, con la línea que
  // las separa de la barra de herramientas.
  tabs?: ReactNode
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
 *  - `top-18` es el alto del header de la app (`top-14`, también sticky) más
 *    el `p-4` del contenedor de página: así, al pegarse, la tarjeta conserva
 *    el mismo aire que tiene en reposo contra el header. El `z-20` deja la
 *    sección por debajo del header de la app (z-40).
 *  - Ningún ancestro puede tener `overflow-hidden` —el `Card` lo trae por
 *    defecto—, así que las páginas que usan esto pasan `overflow-visible`.
 */
export function TablePageHeader({
  title,
  description,
  action,
  tabs,
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
        "sticky top-18 z-20 -mt-(--card-spacing) rounded-t-[inherit] border-t border-b border-t-foreground/5 border-b-border bg-card px-(--card-spacing) pt-(--card-spacing) pb-5",
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
      {tabs ? (
        // A sangre: los márgenes negativos cancelan el padding lateral de la
        // sección para que la línea inferior llegue a los bordes de la
        // tarjeta; el padding lo repone para el contenido.
        <div className="-mx-(--card-spacing) mt-5 border-b border-border px-(--card-spacing)">
          {tabs}
        </div>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  )
}
