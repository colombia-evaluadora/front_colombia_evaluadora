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
 * Se renderiza como una "card" independiente —con su propio borde completo
 * (`border` en los 4 lados) y `rounded-t-lg` para las esquinas superiores—,
 * NO dentro de la `<Card>` que envuelve el cuerpo. Si los dos compartieran
 * Card, el `border-b` del encabezado se sumaría al `ring-1` del Card padre y
 * daría una línea doble en el medio. Encapsularlos separados permite que
 * cada uno tenga su propio borde y la separación entre ellos sea limpia.
 *
 * El `rounded-b-none` del encabezado se complementa con el `rounded-t-none`
 * que el `<Card>` del cuerpo debe pasarle: así se ven como una tarjeta
 * única sin redondeos duplicados en el empalme.
 *
 * Condiciones para que el `sticky` funcione:
 *  - `top-18` es el alto del header de la app (`top-14`, también sticky) más
 *    el `p-4` del contenedor de página: así, al pegarse, el encabezado
 *    conserva el mismo aire que tiene en reposo contra el header en vez de
 *    quedar calzada. Ese respiro lo pinta el `before:` con el fondo de la
 *    página, porque si no el contenido se vería pasar por ahí. El `z-20` lo
 *    deja por debajo del header de la app (z-40).
 *  - El `<Card>` que envuelve el cuerpo debe pasar `overflow-visible` (lo
 *    trae `overflow-hidden` por defecto) para no romper el sticky.
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
        // Encabezado como Card propia: borde completo en los 4 lados
        // (antes solo tenía `border-t border-b` y dependía del `ring-1` del
        // Card padre para los costados). `rounded-t-lg` redondea arriba;
        // `rounded-b-none` deja la base plana para pegarse al Card de abajo.
        // El `border-b-border` (más oscuro) separa el encabezado del cuerpo.
        "sticky top-18 z-20 rounded-t-lg rounded-b-none border border-t-foreground/5 border-r-foreground/5 border-b-border border-l-foreground/5 bg-card px-(--card-spacing) pt-(--card-spacing) pb-5",
        // La franja tapa lo que pasa por detrás del header sticky y repone
        // el `ring-1` que el Card ya no le presta (ahora son Cards
        // independientes, no una encapsulada en la otra).
        "before:absolute before:inset-x-0 before:bottom-full before:h-4 before:bg-background",
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
