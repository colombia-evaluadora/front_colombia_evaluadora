import { Link } from "@tanstack/react-router"

import { TableScreenTabs } from "@/components/layout/table-screen"
import { paths } from "@/config/paths"

const viewLinks = [
  { label: "Por sesión", to: paths.app.auditoriaSesiones.getHref() },
  { label: "Por tablas", to: paths.app.auditoriaTablas.getHref() },
  { label: "Bitácora", to: paths.app.bitacora.getHref() },
]

/** Pestañas de Registro de actividad. */
export function AuditViewTabs() {
  return (
    <TableScreenTabs>
      <nav aria-label="Vistas de auditoría" className="flex items-end gap-1">
        {viewLinks.map((view) => (
          <Link
            key={view.to}
            to={view.to}
            activeProps={{ "data-active": "true" }}
            className="-mb-px rounded-t-lg border border-border border-b-border bg-muted/60 px-4 py-1.5 text-sm font-medium text-muted-foreground data-active:border-b-card data-active:bg-card data-active:text-foreground"
          >
            {view.label}
          </Link>
        ))}
      </nav>
    </TableScreenTabs>
  )
}
