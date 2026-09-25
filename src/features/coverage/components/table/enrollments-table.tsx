"use no memo"

import { useMemo, useState } from "react"
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
import { ConfirmAsignarCupoEnrollmentDialog } from "@/features/coverage/components/dialogs/dialog-confirm-asignar-cupo-enrollment"
import { Button } from "@/components/ui/button"
import { FileDownloadOutlinedIcon, UserGroupAddIcon } from "@/components/ui/icons"

interface EnrollmentsTableProps {
  title: ReactNode
  periodInfo?: ReactNode
  action?: ReactNode
}

export function EnrollmentsTable({ title, periodInfo, action }: EnrollmentsTableProps) {
  const [openAsignarCupo, setOpenAsignarCupo] = useState(false)
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useEnrollmentFilters()
  const { data, isPending, isError, refetch } = useEnrollmentsQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const { table, selectedIds, hasSelection, resetSelection } = useDataTable({
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

  /**
   * "Asignar cupo" reemplaza a "Agregar inscripción" cuando toda la selección
   * son estudiantes sin cupo asignado -- no tiene sentido ofrecer la acción si
   * hay alguno ya matriculado.
   */
  const canAsignarCupo = useMemo(() => {
    if (!hasSelection || !data?.rows.length) return false
    const selected = data.rows.filter((row) => selectedIds.includes(row.id))
    return selected.length > 0 && selected.every((row) => row.status === "sin_asignar_cupo")
  }, [hasSelection, data?.rows, selectedIds])

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
            {canAsignarCupo ? (
              <>
                <Button size="sm" color="primary" onClick={() => setOpenAsignarCupo(true)}>
                  <UserGroupAddIcon data-icon="inline-start" />
                  Asignar cupo
                </Button>
                <ConfirmAsignarCupoEnrollmentDialog
                  open={openAsignarCupo}
                  onOpenChange={setOpenAsignarCupo}
                  onConfirm={() => {
                    // TODO: llamar mutación con selectedIds
                    console.log("Asignar cupo", { selectedIds })
                    resetSelection()
                  }}
                />
              </>
            ) : (
              <AddEnrollmentDialog />
            )}
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
