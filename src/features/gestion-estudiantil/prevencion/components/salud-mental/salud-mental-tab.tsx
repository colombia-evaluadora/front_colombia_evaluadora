"use no memo"

import type { ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import {
  TableScreenBody,
  TableScreenHeader,
  TableScreenTabs,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "@/components/ui/icons"
import { getErrorMessage } from "@/lib/api-client"

import { SearchSaludMental } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/search-salud-mental"
import { useSaludMentalLista } from "@/features/gestion-estudiantil/prevencion/hooks/use-salud-mental-lista"

/** Pestaña «Salud mental» (§9.6): señales que la persona ve, con filtros y acciones por fila. */
export function SaludMentalTab({ tabs }: { tabs: ReactNode }) {
  const l = useSaludMentalLista()
  const { f, query, table, filters, pageIndex, pageSize } = l
  const { data, isPending, isError, error, refetch } = query
  const total = data?.totalCount ?? 0

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button size="sm" type="button" onClick={l.irReporteSaludMental}>
              <PlusIcon data-icon="inline-start" />
              Nuevo reporte
            </Button>
          }
        >
          Prevención y retención
        </TableScreenTitle>
        <TableScreenTabs>{tabs}</TableScreenTabs>
        <TableScreenToolbar>
          <SearchSaludMental
            search={f.search}
            onSearchChange={f.onSearchChange}
            filters={f.filtros}
            applyFilters={f.applyFilters}
            onClearAll={f.onClearAll}
            onDraftChange={f.onDraftChange}
            opciones={f.opciones}
          />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {total} {total === 1 ? "señal" : "señales"}
          </p>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending && filters != null}
          isError={isError}
          onRetry={refetch}
          emptyMessage={
            f.sinEstablecimiento
              ? "No tiene sedes asignadas: elija una sede para ver las señales."
              : f.hayFiltros
                ? "No hay señales para los filtros aplicados."
                : "Aún no hay señales de salud mental."
          }
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
