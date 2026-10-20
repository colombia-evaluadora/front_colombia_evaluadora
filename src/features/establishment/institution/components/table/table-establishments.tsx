"use no memo"

import { useMemo, type ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"

import { useEstablishmentsFilters } from "@/features/establishment/institution/hooks/use-filters"
import { useEstablishmentsQuery } from "@/features/establishment/institution/api/query/use-establishments"
import {
  useBulkDelete,
  summarizeEstablishmentBulkDelete,
} from "@/features/establishment/institution/api/mutations/use-bulk-delete"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { CATALOGS } from "@/lib/catalogs"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import type { Establishment } from "@/features/establishment/institution/api/types/establishment"
import { columns } from "@/features/establishment/institution/components/table/columns-establishments"
import { DialogBulkDelete } from "@/features/establishment/employees/components/dialogs/dialog-bulk-delete"
import { ClearSelectionDialog } from "@/features/establishment/employees/components/dialogs/dialog-clear-selection"
import { ExportEstablishmentsDialog } from "@/features/establishment/institution/components/dialogs/dialog-export"
import { ExportSelectedEstablishmentsDialog } from "@/features/establishment/institution/components/dialogs/dialog-export-selected"
import { SearchEstablishments } from "@/features/establishment/institution/components/search/search-establishments"
import { useNotify } from "@/components/notice/notice-context"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

interface EstablishmentsDataTableProps {
  title: ReactNode
  // Acción principal, en la barra de herramientas.
  action?: ReactNode
}

export function EstablishmentsDataTable({ title, action }: EstablishmentsDataTableProps) {
  const { notify } = useNotify()
  const { puedeEliminar } = useMenuPermission("ESTABLECIMIENTO", { onlineOnlyWrites: true })
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()

  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useEstablishmentsFilters()

  const { data: entityStatuses = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ENTITY_STATUSES)
  /** El catálogo dice "Activo"; aquí se muestra en femenino sin tocar el `code`. */
  const establishmentStatuses = useMemo(
    () =>
      entityStatuses.map((status) =>
        status.code === "ACTIVE" || status.code === "A" ? { ...status, name: "Activa" } : status,
      ),
    [entityStatuses],
  )

  const { data, isPending, isError, error, refetch } = useEstablishmentsQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const { table, selectedIds, selectedRows: selectedItems, hasSelection, resetSelection } = useDataTable({
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
    columnVisibilityStorageKey: "table-establishments-column-visibility",
  })

  const namesById = useMemo(
    () => new Map(selectedItems.map((row) => [String(row.id), row.name])),
    [selectedItems],
  )

  const bulkDelete = useBulkDelete({
    mutationConfig: {
      onSuccess: (result) => {
        const summary = summarizeEstablishmentBulkDelete(result)
        if (summary.failed.length === 0) {
          notify(SUCCESS_MESSAGES.establishment.deletedMany(summary.succeededCount))
          resetSelection()
          return
        }
        const failedNames = summary.failed
          .map(({ id, reason }) => `${namesById.get(id) ?? id} (${reason})`)
          .join(", ")
        notify(
          summary.succeededCount > 0
            ? `Se eliminaron ${summary.succeededCount} establecimiento(s). No se pudo con: ${failedNames}.`
            : `No se pudo eliminar: ${failedNames}.`,
          { variant: "error" },
        )
        resetSelection()
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>{title}</TableScreenTitle>
        <TableScreenToolbar>
          <SearchEstablishments
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
            statuses={establishmentStatuses}
          />

          <TableScreenActions>
            {action}
            {hasSelection ? (
              <>
                <ClearSelectionDialog resetSelection={resetSelection} />
                {puedeEliminar ? (
                  <DialogBulkDelete<Establishment, number>
                    items={selectedItems}
                    getItemId={(item) => item.id}
                    getItemLabel={(item) => item.name}
                    title="Eliminar"
                    buildDescription={(count, sample) => {
                      const list = sample.join(", ")
                      const suffix = count > sample.length ? ` y ${count - sample.length} más` : ""
                      return `Se eliminarán los establecimientos educativos ${list}${suffix} (${count} en total). Esta acción no se puede deshacer.`
                    }}
                    onConfirm={async (ids) => {
                      await bulkDelete.mutateAsync(ids)
                    }}
                    triggerLabel={`Eliminar (${selectedIds.length})`}
                  />
                ) : null}
                <ExportSelectedEstablishmentsDialog
                  selectedIds={selectedItems.map((item) => item.id)}
                  resetSelection={resetSelection}
                />
              </>
            ) : (
              <ExportEstablishmentsDialog filters={queryFilters} />
            )}
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
