import { AuditSessionDataTable } from "../components/table/audit-session-table"

export function AuditSessionPage() {
  // El encabezado sticky y el cuerpo son dos Cards independientes, NO se
  // encapsulan en una misma Card aquí — eso lo hace internamente
  // `AuditSessionDataTable`.
  return <AuditSessionDataTable />
}
