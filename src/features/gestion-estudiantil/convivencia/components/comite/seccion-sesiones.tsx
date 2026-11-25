"use no memo"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { getErrorMessage } from "@/lib/api-client"

import { SearchSesiones } from "@/features/gestion-estudiantil/convivencia/components/comite/search-sesiones"
import { buildColumnsSesiones } from "@/features/gestion-estudiantil/convivencia/components/comite/columns-sesiones"
import type { useComiteTab } from "@/features/gestion-estudiantil/convivencia/hooks/use-comite-tab"

interface Props {
  tab: ReturnType<typeof useComiteTab>
  onVer: (id: number) => void
  onModificar: (id: number) => void
}

/** «Sesiones» del Comité: filtro por tipo, tabla y paginación (G.2.COM.SES.1). */
export function SeccionSesiones({ tab, onVer, onModificar }: Props) {
  const { sesiones, pagina } = tab
  const rows = sesiones.data?.rows ?? []
  const pageCount = sesiones.data?.pageCount ?? 1

  const { table } = useDataTable({
    columns: buildColumnsSesiones({
      onAccion: (s, accion) => (accion === "ver" ? onVer(s.id) : onModificar(s.id)),
    }),
    data: rows,
    pageCount,
    getRowId: (row) => String(row.id),
    ...pagina,
    columnVisibilityStorageKey: "convivencia-sesiones-column-visibility",
  })

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Sesiones</h2>
          <SearchSesiones
            search={tab.search}
            onSearchChange={tab.setSearch}
            filters={tab.filtros}
            applyFilters={tab.aplicarFiltros}
            onClearAll={tab.limpiar}
            onDraftChange={() => {}}
            tipos={tab.tipos}
          />
        </div>
      </div>
      <DataTable
        table={table}
        isPending={sesiones.isPending}
        isError={sesiones.isError}
        onRetry={sesiones.refetch}
        emptyMessage={tab.hayFiltros ? "No hay sesiones para el filtro aplicado." : "Aún no hay sesiones del comité en este período."}
        errorMessage={sesiones.error ? getErrorMessage(sesiones.error) : undefined}
      />
      <Pagination
        pageIndex={pagina.pageIndex}
        pageCount={pageCount}
        canPrev={pagina.pageIndex > 0}
        canNext={pagina.pageIndex < pageCount - 1}
        onPageChange={pagina.goToPage}
        totalCount={sesiones.data?.totalCount ?? 0}
        pageSize={pagina.pageSize}
        onPageSizeChange={pagina.setPageSize}
        viewOptions={<DataTableViewOptions table={table} />}
      />
    </section>
  )
}
