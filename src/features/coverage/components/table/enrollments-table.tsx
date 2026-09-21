"use no memo"

import type { ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"

import { useEnrollmentsQuery } from "@/features/coverage/api/query/use-enrollments-query"
import { useEnrollmentFilters } from "@/features/coverage/hooks/use-enrollment-filters"
import { columnsEnrollments } from "@/features/coverage/components/table/columns-enrollments"
import { SearchEnrollments } from "@/features/coverage/components/search/search-enrollments"
import { AddEnrollmentDialog } from "@/features/coverage/components/dialogs/dialog-add-enrollment"
import { Button } from "@/components/ui/button"
import { FileDownloadOutlinedIcon } from "@/components/ui/icons"

interface EnrollmentsTableProps {
  title: ReactNode
  periodInfo?: ReactNode
  action?: ReactNode
}

export function EnrollmentsTable({ title, periodInfo, action }: EnrollmentsTableProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useEnrollmentFilters()
  const { data, isPending, isError, refetch } = useEnrollmentsQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const { table } = useDataTable({
    columns: columnsEnrollments,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => row.id,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "enrollments-table-column-visibility",
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle action={action}>{title}</TableScreenTitle>
        {periodInfo ? (
          <div className="px-(--screen-spacing) pt-4 pb-0">{periodInfo}</div>
        ) : null}
        <TableScreenToolbar>
          <SearchEnrollments
            activeFilterCount={activeFilterCount}
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
          />

          <TableScreenActions>
            <AddEnrollmentDialog />
            <Button
              size="icon-sm"
              variant="outline"
              color="muted"
              aria-label="Exportar"
              onClick={() => console.log("Exportar")}
            >
              <FileDownloadOutlinedIcon />
            </Button>
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage="Sin resultados."
          errorMessage="Ocurrió un error al cargar las inscripciones."
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
