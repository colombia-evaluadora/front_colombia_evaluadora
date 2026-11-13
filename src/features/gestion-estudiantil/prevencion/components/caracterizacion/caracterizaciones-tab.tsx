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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "@/components/ui/icons"
import { getErrorMessage } from "@/lib/api-client"

import { SearchCaracterizaciones } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/search-caracterizaciones"
import { useCaracterizacionesLista } from "@/features/gestion-estudiantil/prevencion/hooks/use-caracterizaciones-lista"

/** Pestaña «Caracterización» (§9.8): estudiantes Cursando con el estado de su caracterización familiar y de vivienda. */
export function CaracterizacionesTab({ tabs }: { tabs: ReactNode }) {
  const l = useCaracterizacionesLista()
  const { f, query, table, filters, pageIndex, pageSize } = l
  const { data, isPending, isError, error, refetch } = query
  const total = data?.totalCount ?? 0
  const sinConfirmar = data?.sinConfirmar ?? 0

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle>Prevención y retención</TableScreenTitle>
        <TableScreenTabs>{tabs}</TableScreenTabs>
        <TableScreenToolbar>
          <SearchCaracterizaciones
            search={f.search}
            onSearchChange={f.onSearchChange}
            filters={f.filtros}
            applyFilters={f.applyFilters}
            onClearAll={f.onClearAll}
            onDraftChange={f.onDraftChange}
            opciones={f.opciones}
          />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {total} {total === 1 ? "estudiante" : "estudiantes"}
          </p>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        {sinConfirmar > 0 && (
          <Alert className="mb-4">
            <InfoIcon aria-hidden="true" />
            <AlertDescription>
              {sinConfirmar} {sinConfirmar === 1 ? "estudiante sin caracterización confirmada" : "estudiantes sin caracterización confirmada"} este año.
            </AlertDescription>
          </Alert>
        )}
        <DataTable
          table={table}
          isPending={isPending && filters != null}
          isError={isError}
          onRetry={refetch}
          emptyMessage={
            f.sinEstablecimiento
              ? "No tiene sedes asignadas: elija una sede para ver las caracterizaciones."
              : f.hayFiltros
                ? "No hay estudiantes para los filtros aplicados."
                : "No hay estudiantes Cursando en este período."
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
    </>
  )
}
