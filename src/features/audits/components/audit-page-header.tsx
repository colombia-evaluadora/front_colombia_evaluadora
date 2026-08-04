import type { ReactNode } from "react"

import { TablePageHeader } from "@/components/table-page-header"

import { AuditViewTabs } from "./audit-view-tabs"

/**
 * Encabezado común de las dos vistas de auditoría: mismo título y
 * descripción, las pestañas para cambiar de vista y, debajo, la barra de
 * filtros de cada una. Todo dentro de la sección `sticky` del
 * `TablePageHeader`, así se queda pegado al hacer scroll.
 */
export function AuditPageHeader({ children }: { children?: ReactNode }) {
  return (
    <TablePageHeader
      title="Registro de actividad"
      description="Trazabilidad de lo que pasa en el sistema: quién hizo cada operación, cuándo y sobre qué datos."
      tabs={<AuditViewTabs />}
    >
      {children}
    </TablePageHeader>
  )
}
