"use no memo"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { TablePaginationProvider } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"

import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { SearchCasos } from "@/features/gestion-estudiantil/reintegracion/components/search-casos"
import { useCasosLista } from "@/features/gestion-estudiantil/reintegracion/hooks/use-casos-lista"

function ReintegracionContent() {
  const l = useCasosLista()
  const { f, query, table, filters, pageIndex, pageSize } = l
  const { data, isPending, isError, error, refetch } = query
  const total = data?.totalCount ?? 0

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button size="sm" type="button" disabled={!l.puedeAbrir} onClick={l.abrirCaso}>
              <ControlPointIcon data-icon="inline-start" />
              Abrir caso
            </Button>
          }
        >
          Reintegración
        </TableScreenTitle>
        <TableScreenToolbar>
          <SearchCasos
            search={f.search}
            onSearchChange={f.onSearchChange}
            filters={f.filtros}
            applyFilters={f.applyFilters}
            onClearAll={f.onClearAll}
            onDraftChange={f.onDraftChange}
            opciones={f.opciones}
          />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {total} {total === 1 ? "caso" : "casos"}
          </p>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending && filters != null}
          isError={isError}
          onRetry={refetch}
          emptyMessage={f.hayFiltros ? "No hay casos para los filtros aplicados." : "No hay casos de reintegración."}
          errorMessage={error ? getErrorMessage(error) : undefined}
        />
        <Pagination
          pageIndex={pageIndex}
          pageCount={data?.pageCount ?? 1}
          canPrev={pageIndex > 0}
          canNext={pageIndex < (data?.pageCount ?? 1) - 1}
          onPageChange={l.goToPage}
          totalCount={total}
          pageSize={pageSize}
          onPageSizeChange={l.setPageSize}
          viewOptions={<DataTableViewOptions table={table} />}
        />
      </TableScreenBody>
      {l.dialogos}
    </>
  )
}

/** Reintegración (Gestión Estudiantil §10): bandeja de casos de la Ruta de Reintegración. */
export function ReintegracionPage() {
  const { puedeVer, isLoading } = useMenuPermission("REINTEGRACION")

  if (!isLoading && !puedeVer) {
    return (
      <Alert variant="destructive" className="m-4 w-auto">
        <AlertDescription>No tiene acceso a la Ruta de Reintegración.</AlertDescription>
      </Alert>
    )
  }

  return (
    <NoticeProvider>
      <TableScreen>
        <TablePaginationProvider>
          <ReintegracionContent />
        </TablePaginationProvider>
      </TableScreen>
    </NoticeProvider>
  )
}
