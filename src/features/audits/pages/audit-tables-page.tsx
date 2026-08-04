import { Card } from "@/components/ui/card"

import { AuditPageHeader } from "../components/audit-page-header"
import { AuditTablesGrid } from "../components/table/audit-tables-grid"
import { FilterAuditTablesForm } from "../components/forms/form-filter-audit-tables"
import { useAuditTablesFilters } from "../hooks/use-audit-tables-filters"

const FILTER_AUDIT_TABLES_FORM_ID = "filter-audit-tables-form"

export function AuditTablesPage() {
  const { filters, applyFilters } = useAuditTablesFilters()

  return (
    // `overflow-visible`: el `overflow-hidden` del Card anularía el sticky
    // del encabezado.
    <Card className="overflow-visible">
      <AuditPageHeader>
        <FilterAuditTablesForm
          id={FILTER_AUDIT_TABLES_FORM_ID}
          defaultValues={filters}
          onSubmit={applyFilters}
        />
      </AuditPageHeader>
      <div className="px-(--card-spacing)">
        <AuditTablesGrid />
      </div>
    </Card>
  )
}
