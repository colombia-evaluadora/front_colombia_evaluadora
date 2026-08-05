import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"
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
 * Usa el componente `<Card>` (no un `<section>` con bordes hechos a mano)
 * para tener `bg-card`, `ring-1` y `rounded-lg` consistentes con el resto
 * de Cards del sistema. Se renderiza como una "card" independiente —NO
 * dentro de la `<Card>` que envuelve el cuerpo. Si los dos compartieran
 * Card, el `ring-1` se sumaría al `border-b` del encabezado y daría línea
 * doble en el medio. Encapsularlos separados permite que cada uno tenga su
 * propio borde y la separación entre ellos sea limpia.
 *
 * El `rounded-b-none` del encabezado se complementa con el `rounded-t-none`
 * que el `<Card>` del cuerpo debe pasarle: así se ven como una tarjeta
 * única sin redondeos duplicados en el empalme.
 *
 * Condiciones para que el `sticky` funcione:
 *  - `top-18` es el alto del header de la app (`top-14`, también sticky) más
 *    el `p-4` del contenedor de página: así, al pegarse, el encabezado
 *    conserva el mismo aire que tiene en reposo contra el header. El
 *    `z-20` lo deja por debajo del header de la app (z-40).
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
    <Card
      data-slot="table-page-header"
      // `py` y `gap` se anulan para que el padding lo controlen los bloques
      // internos (título con bg-muted, pestañas a sangre, toolbar con su
      // padding). `rounded-b-none` deja la base plana para pegarse al Card
      // del cuerpo (que pasa `rounded-t-none`). `overflow-visible` mantiene
      // el sticky funcionando.
      className={cn(
        "sticky top-18 z-20 gap-0 overflow-visible rounded-b-none py-0",
        className,
      )}
    >
      {/*
        Bloque del título: `bg-muted` y un `border-b` lo separan visualmente
        del resto del encabezado (pestañas + barra de herramientas). El
        padding lateral se aplica a sangre con `-mx-(--card-spacing)` para
        que el `border-b` llegue a los bordes completos de la tarjeta.
      */}
      <div className="-mx-(--card-spacing) flex items-start justify-between gap-4 border-b border-b-border bg-muted px-(--card-spacing) py-(--card-spacing)">
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
        // A sangre: los márgenes negativos cancelan el padding lateral del
        // Card para que la línea inferior llegue a los bordes; el padding
        // lo repone para el contenido.
        <div className="-mx-(--card-spacing) mt-5 border-b border-border px-(--card-spacing)">
          {tabs}
        </div>
      ) : null}
      {children ? <div className="px-(--card-spacing) pt-5 pb-(--card-spacing)">{children}</div> : null}
    </Card>
  )
}
