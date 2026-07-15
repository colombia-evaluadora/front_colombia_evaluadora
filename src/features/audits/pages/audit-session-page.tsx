import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { AuditSessionDataTable } from "../components/table/audit-session-table"

export function AuditSessionPage() {
  return (
    <Card>
      <CardHeader>
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
