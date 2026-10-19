import { auditoriaTablasRoute } from "@/router"

import type { AuditTablesFiltersFormInput, AuditTablesFiltersFormValues } from "@/features/administration/audits/api/schema"
import type { AuditTablesQueryRequest } from "@/features/administration/audits/api/types/audit-table"

export interface AuditTablesFilters {
  filters: AuditTablesFiltersFormInput
  queryFilters: AuditTablesQueryRequest["filters"]
  applyFilters: (values: AuditTablesFiltersFormValues) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useAuditTablesFilters(): AuditTablesFilters {
  const search = auditoriaTablasRoute.useSearch()
  const navigate = auditoriaTablasRoute.useNavigate()

  const applyFilters = (values: AuditTablesFiltersFormValues) => {
    navigate({
      search: (prev) => ({
        ...prev,
        name: values.name || undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  const clearAllFilters = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        name: undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  const queryFilters: AuditTablesQueryRequest["filters"] = {
    name: search.name,
  }

  const activeFilterCount = search.name ? 1 : 0

  return {
    filters: {
      name: search.name ?? "",
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}
