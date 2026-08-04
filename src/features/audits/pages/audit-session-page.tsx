import { Card } from "@/components/ui/card"

import { AuditSessionDataTable } from "../components/table/audit-session-table"

export function AuditSessionPage() {
  return (
    // `overflow-visible`: el `overflow-hidden` del Card anularía el sticky
    // del encabezado.
    <Card className="overflow-visible">
      <AuditSessionDataTable />
    </Card>
  )
}
