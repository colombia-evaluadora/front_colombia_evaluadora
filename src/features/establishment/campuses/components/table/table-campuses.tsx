"use no memo"

import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { toSearchOptions } from "@/lib/catalog-options"
import { CATALOGS } from "@/lib/catalogs"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"

import { useCampusesFilters } from "@/features/establishment/campuses/hooks/use-filters"
import { useCampusesQuery } from "@/features/establishment/campuses/api/query/use-campuses"
import { columns } from "@/features/establishment/campuses/components/table/columns-campuses"
import { ExportCampusesDialog } from "@/features/establishment/campuses/components/dialogs/dialog-export"
import { SearchCampuses } from "@/features/establishment/campuses/components/search/search-campuses"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"
import { selectCategoryQueryOptions } from "@/features/establishment/academic-period/api/query/fetch-select-category"

/** `VALOR` de "Urbana y Rural": describe al establecimiento, nunca a una sede (Regla 21). */
const ZONA_MIXTA = "3"

interface CampusesDataTableProps {
  title: ReactNode
  // Acción principal, en la barra de herramientas.
  action?: ReactNode
}

export function CampusesDataTable({ title, action }: CampusesDataTableProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()

  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } = useCampusesFilters()

  const { data: establishments = [] } = useEstablishmentsOptionsQuery()
  const { data: zones = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ZONES)
  const { data: workSchedules = [] } = useQuery(selectCategoryQueryOptions("JORNADA"))

  const { data, isPending, isError, error, refetch } = useCampusesQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    // `getRowId` devuelve string; el id real es number.
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-campuses-column-visibility",
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>{title}</TableScreenTitle>
        <TableScreenToolbar>
          <SearchCampuses
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
            establishments={establishments.map((item) => ({ value: String(item.id), label: item.name }))}
            zones={toSearchOptions(zones.filter((zone) => zone.code !== ZONA_MIXTA))}
            workSchedules={workSchedules.map((row) => ({ value: row.valor, label: row.nombre }))}
          />

          <TableScreenActions>
            <ExportCampusesDialog filters={queryFilters} />
            {action}
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage="No hay sedes que coincidan con la búsqueda y los filtros aplicados."
          errorMessage={error ? getErrorMessage(error) : undefined}
        />

        {data && (
          <Pagination
            viewOptions={<DataTableViewOptions table={table} />}
            pageIndex={pageIndex}
            pageCount={data.pageCount}
            canPrev={pageIndex > 0}
            canNext={pageIndex < data.pageCount - 1}
            onPageChange={goToPage}
            totalCount={data.totalCount}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        )}
      </TableScreenBody>
    </TableScreen>
  )
}
