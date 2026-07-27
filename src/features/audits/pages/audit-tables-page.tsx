import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@tanstack/react-router"
import { AuditTablesGrid } from "../components/table/audit-tables-grid"
import { paths } from "@/config/paths"
import { Button } from "@/components/ui/button"

export function AuditTablesPage() {
  return (
    <Card>
      <CardHeader>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            render={<Link to={paths.app.auditoriaSesiones.getHref()} />}
            nativeButton={false}
          >
            Por sesión
          </Button>
        </CardAction>
        <CardTitle>Auditoría por tabla</CardTitle>
        <CardDescription>
          Elegí una tabla para ver el historial de operaciones sobre sus registros.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuditTablesGrid />
      </CardContent>
    </Card>
  )
}
