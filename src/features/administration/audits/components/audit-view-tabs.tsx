import { Link, useLocation } from "@tanstack/react-router"

import { TableScreenTabs } from "@/components/layout/table-screen"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { paths } from "@/config/paths"

const viewLinks = [
  { label: "Por sesión", to: paths.app.auditoriaSesiones.getHref() },
  { label: "Por tablas", to: paths.app.auditoriaTablas.getHref() },
  { label: "Bitácora", to: paths.app.bitacora.getHref() },
]

/** Pestañas de Registro de actividad: cada una es un enlace a su vista. */
export function AuditViewTabs() {
  const pathname = useLocation({ select: (l) => l.pathname })
  const active = viewLinks.find((view) => pathname.startsWith(view.to))?.to ?? null

  return (
    <TableScreenTabs>
      <Tabs value={active} aria-label="Vistas de auditoría">
        {/* El borde inferior ya lo pone TableScreenTabs. */}
        <TabsList className="border-b-0">
          {viewLinks.map((view) => (
            <TabsTrigger key={view.to} value={view.to} nativeButton={false} render={<Link to={view.to} />}>
              {view.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </TableScreenTabs>
  )
}
