import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { AuditsDataTable } from "../components/table/audits-table"

export function AuditsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditoría por sesión</CardTitle>
        <CardDescription>
          Historial de sesiones de usuario: autor, origen, duración y estado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuditsDataTable />
      </CardContent>
    </Card>
  )
}
