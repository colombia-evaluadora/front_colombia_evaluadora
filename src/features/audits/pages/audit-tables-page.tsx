import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { AuditTablesGrid } from "../components/tables/audit-tables-grid"

export function AuditTablesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditoría por tabla</CardTitle>
        <CardDescription>
          Elegí una tabla para ver el historial de operaciones sobre sus
          registros.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuditTablesGrid />
      </CardContent>
    </Card>
  )
}
