import { Card } from "@/components/ui/card"

import { AuditPageHeader } from "../components/audit-page-header"
import { AuditTablesGrid } from "../components/table/audit-tables-grid"
import { FilterAuditTablesForm } from "../components/forms/form-filter-audit-tables"
import { useAuditTablesFilters } from "../hooks/use-audit-tables-filters"
import { NoticeOutlet } from "@/components/notice/notice-context"

const FILTER_AUDIT_TABLES_FORM_ID = "filter-audit-tables-form"

export function AuditTablesPage() {
  const { filters, applyFilters } = useAuditTablesFilters()

  return (
    <>
      {/*
        El encabezado y el cuerpo son DOS cards separadas — no se encapsulan
        dentro de un mismo Card — para que cada uno tenga su propio `ring-1`
        (borde). Si los metiera en la misma tarjeta compartirían el mismo
        anillo y se vería raro: el `border-b` del encabezado se sumaría al
        `ring-1` del Card padre y daría una línea doble en el medio.

        El encabezado arriba: borde completo, esquinas superiores redondeadas
        (`rounded-t-lg`), esquinas inferiores planas (`rounded-b-none`) para
        pegarse al Card de abajo.

        El Card de abajo: esquinas superiores planas (`rounded-t-none`) para
        pegarse al encabezado, esquinas inferiores redondeadas
        (`rounded-lg` por default). `overflow-visible` para que el sticky del
        encabezado no se rompa (el Card trae `overflow-hidden` por default).
      */}
      <AuditPageHeader>
        <FilterAuditTablesForm
          id={FILTER_AUDIT_TABLES_FORM_ID}
          defaultValues={filters}
          onSubmit={applyFilters}
        />
      </AuditPageHeader>
      <Card className="overflow-visible rounded-t-none">
        <div className="px-(--card-spacing)">
          <NoticeOutlet className="mb-3" />
          <AuditTablesGrid />
        </div>
      </Card>
    </>
  )
}