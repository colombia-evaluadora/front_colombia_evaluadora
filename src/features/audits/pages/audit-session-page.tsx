import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { AuditSessionDataTable } from "../components/table/audit-session-table"
import { Button } from "@/components/ui/button"
import { paths } from "@/config/paths"
import { Link } from "@tanstack/react-router"

export function AuditSessionPage() {
  return (
    <Card>
      <CardHeader>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            render={<Link to={paths.app.auditoriaTablas.getHref()} />}
            nativeButton={false}
          >
            Por tablas
          </Button>
        </CardAction>
        <CardTitle>Auditoría por sesión</CardTitle>
        <CardDescription>
          Historial de sesiones de usuario: autor, origen, duración y estado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuditSessionDataTable />
      </CardContent>
    </Card>
  )
}
