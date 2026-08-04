import { Link } from "@tanstack/react-router"

import { paths } from "@/config/paths"
import { cn } from "@/lib/utils"

const views = [
  { label: "Por sesión", to: paths.app.auditoriaSesiones.getHref() },
  { label: "Por tablas", to: paths.app.auditoriaTablas.getHref() },
]

/**
 * Navegación entre las dos vistas de auditoría, con aspecto de pestañas de
 * carpeta pero resuelta con links reales (`<a>` con su URL, navegable y
 * compartible).
 *
 * Va en el slot `tabs` del `TablePageHeader`, que le pone la línea inferior
 * de borde a borde. Todas las pestañas se corren un pixel hacia abajo
 * (`-mb-px`) para quedar montadas sobre esa línea: las inactivas la redibujan
 * con su propio borde y la activa la tapa con el color del panel, que es lo
 * que la hace parecer parte de lo que sigue.
 */
export function AuditViewTabs({ className }: { className?: string }) {
  return (
    <nav aria-label="Vistas de auditoría" className={cn("flex items-end gap-1", className)}>
      {views.map((view) => (
        <Link
          key={view.to}
          to={view.to}
          activeProps={{ "data-active": "true" }}
          className={cn(
            "-mb-px rounded-t-lg border border-border border-b-border bg-muted/60 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors",
            // El hover y el pressed son solo de las pestañas inactivas: la
            // activa ya es el panel, cambiarle el fondo la despegaría de él.
            "[&:not([data-active])]:hover:bg-muted [&:not([data-active])]:hover:text-foreground [&:not([data-active])]:active:bg-muted",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring",
            "data-active:cursor-default data-active:border-b-card data-active:bg-card data-active:text-foreground",
          )}
        >
          {view.label}
        </Link>
      ))}
    </nav>
  )
}
