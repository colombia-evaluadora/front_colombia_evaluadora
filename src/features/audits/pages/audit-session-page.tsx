import { Card } from "@/components/ui/card"

import { AuditSessionDataTable } from "../components/table/audit-session-table"
import { Button } from "@/components/ui/button"
import { paths } from "@/config/paths"
import { Link } from "@tanstack/react-router"

export function AuditSessionPage() {
  return (
    // `overflow-visible`: el `overflow-hidden` del Card anularía el sticky
    // del encabezado.
    <Card className="overflow-visible">
      <AuditSessionDataTable
        title="Registro de actividad por sesión"
        description="Historial de sesiones de usuario: autor, origen, duración y estado."
        action={
          <Button
            variant="ghost"
            size="sm"
            render={<Link to={paths.app.auditoriaTablas.getHref()} />}
            nativeButton={false}
          >
            Por tablas
          </Button>
        }
      />
    </Card>
  )
}
