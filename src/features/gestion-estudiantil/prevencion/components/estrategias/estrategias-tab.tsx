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
import { ControlPointIcon } from "@/components/ui/icons"
import { getErrorMessage } from "@/lib/api-client"

import { SearchEstrategias } from "@/features/gestion-estudiantil/prevencion/components/estrategias/search-estrategias"
import { useEstrategiasLista } from "@/features/gestion-estudiantil/prevencion/hooks/use-estrategias-lista"

/** Pestaña «Estrategias» (§9.7): estrategias de permanencia que la persona ve, con filtros y acciones por fila. */
export function EstrategiasTab({ tabs }: { tabs: ReactNode }) {
  const l = useEstrategiasLista()
  const { f, query, table, filters, pageIndex, pageSize } = l
  const { data, isPending, isError, error, refetch } = query
  const total = data?.totalCount ?? 0

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button size="sm" type="button" disabled={!l.puedeCrear} onClick={l.irEstrategiaNueva}>
              <ControlPointIcon data-icon="inline-start" />
              Nueva estrategia
            </Button>
          }
        >
          Prevención y retención
        </TableScreenTitle>
        <TableScreenTabs>{tabs}</TableScreenTabs>
        <TableScreenToolbar>
          <SearchEstrategias
            search={f.search}
            onSearchChange={f.onSearchChange}
            filters={f.filtros}
            applyFilters={f.applyFilters}
            onClearAll={f.onClearAll}
            onDraftChange={f.onDraftChange}
            opciones={f.opciones}
          />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {total} {total === 1 ? "estrategia" : "estrategias"}
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
              ? "No tiene sedes asignadas: elija una sede para ver las estrategias."
              : f.hayFiltros
                ? "No hay estrategias para los filtros aplicados."
                : "Aún no hay estrategias de permanencia en este período."
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
