"use no memo"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { FilePdfIcon, FileXlsIcon } from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { useUser } from "@/lib/auth"
import { parseDateValue } from "@/lib/date-value"
import { toPageCount } from "@/lib/pagination"

import { AuditViewTabs } from "@/features/administration/audits/components/audit-view-tabs"
import { ESTABLECIMIENTOS } from "@/features/bitacora/api/mock-bitacora"
import { useBitacoraQuery } from "@/features/bitacora/api/query/use-bitacora-query"
import { BITACORA_MODULOS, type BitacoraEvento } from "@/features/bitacora/api/types/bitacora"
import { createBitacoraColumns } from "@/features/bitacora/components/columns-bitacora"
import { DetalleEvento } from "@/features/bitacora/components/detalle-evento"
import { DialogRestaurarEvento } from "@/features/bitacora/components/dialog-restaurar-evento"
import { SearchBitacora } from "@/features/bitacora/components/search-bitacora"
import { useBitacoraFilters } from "@/features/bitacora/hooks/use-bitacora-filters"

/** El `NoticeProvider` lo pone el layout de Registro de actividad. */
export function BitacoraPage() {
  return <BitacoraPageContent />
}

const fechaCorta = (value: string) => {
  const d = parseDateValue(value)
  return d ? format(d, "d MMM yyyy", { locale: es }) : ""
}

function BitacoraPageContent() {
  const { notify } = useNotify()
  const { data: user } = useUser()
  const { filters, applyFilters, clearAllFilters, activeFilterCount } = useBitacoraFilters()
  const { modulo } = filters
  const config = BITACORA_MODULOS[modulo]
  const paginacion = useTablePagination()
  const [expandidoId, setExpandidoId] = useState<number | null>(null)
  const [restaurando, setRestaurando] = useState<BitacoraEvento | null>(null)

  const { data: eventos = [], isPending, isError, error, refetch } = useBitacoraQuery(filters)

  // Más recientes primero, salvo que se ordene por otra columna.
  const [orden] = paginacion.sorting
  const ordenados = [...eventos].sort((a, b) => {
    if (!orden || orden.id === "fecha") {
      const r = a.fecha.getTime() - b.fecha.getTime()
      return orden && !orden.desc ? r : -r
    }
    const valor = (e: BitacoraEvento) =>
      orden.id === "usuario" ? e.usuario.nombre : orden.id === "sede" ? `${e.sede}` : orden.id === "accion" ? e.accion : e.entidad
    const r = valor(a).localeCompare(valor(b), "es")
    return orden.desc ? -r : r
  })
  const pageCount = toPageCount(ordenados.length, paginacion.pageSize)
  const pageIndex = Math.min(paginacion.pageIndex, Math.max(pageCount - 1, 0))
  const desde = pageIndex * paginacion.pageSize
  const pagina = ordenados.slice(desde, desde + paginacion.pageSize)

  const columns = createBitacoraColumns({
    conSedeJornada: modulo !== "administracion",
    expandidoId,
    onToggle: (e) => setExpandidoId((id) => (id === e.id ? null : e.id)),
  })
  const { table } = useDataTable({
    columns,
    data: pagina,
    pageCount,
    getRowId: (row) => String(row.id),
    ...paginacion,
    pageIndex,
    columnVisibilityStorageKey: "bitacora-column-visibility",
  })

  const establecimiento = ESTABLECIMIENTOS.find((e) => e.value === filters.establecimiento)?.label
  const alcance =
    modulo === "administracion"
      ? `del ${fechaCorta(filters.desde)} al ${fechaCorta(filters.hasta)}`
      : `${establecimiento}, del ${fechaCorta(filters.desde)} al ${fechaCorta(filters.hasta)}`

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description={alcance}>Bitácora de {config.nombre}</TableScreenTitle>
        <AuditViewTabs />
        <TableScreenToolbar>
          <SearchBitacora
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
            esSuperAdmin={Boolean(user?.isSuperAdmin)}
          />
          <TableScreenActions>
            {(["PDF", "Excel"] as const).map((formato) => (
              <Button
                key={formato}
                variant="outline"
                color="neutral"
                size="sm"
                disabled={eventos.length === 0}
                // TODO: reporte con los mismos filtros cuando exista en el back; queda registrado.
                onClick={() =>
                  notify(`La exportación a ${formato} estará disponible cuando se conecte la bitácora.`, {
                    variant: "info",
                  })
                }
              >
                {formato === "PDF" ? <FilePdfIcon data-icon="inline-start" /> : <FileXlsIcon data-icon="inline-start" />}
                Exportar {formato}
              </Button>
            ))}
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          renderSubRow={(row) =>
            expandidoId === row.original.id ? (
              <DetalleEvento evento={row.original as BitacoraEvento} onRestaurar={setRestaurando} />
            ) : null
          }
          emptyMessage={
            <span className="flex flex-col items-center gap-3">
              No hay registros de la bitácora que coincidan con la búsqueda y los filtros aplicados.
              <Button size="sm" variant="outline" color="neutral" onClick={clearAllFilters}>
                Limpiar filtros
              </Button>
            </span>
          }
        />
        <Pagination
          viewOptions={<DataTableViewOptions table={table} />}
          pageIndex={pageIndex}
          pageCount={pageCount}
          canPrev={pageIndex > 0}
          canNext={pageIndex < pageCount - 1}
          onPageChange={paginacion.goToPage}
          totalCount={ordenados.length}
          pageSize={paginacion.pageSize}
          onPageSizeChange={paginacion.setPageSize}
        />
      </TableScreenBody>

      <DialogRestaurarEvento
        modulo={modulo}
        evento={restaurando}
        onClose={() => setRestaurando(null)}
        onRestaurado={() => {
          setRestaurando(null)
          notify("Información restaurada. Se creó el evento Restauración.")
        }}
      />
    </TableScreen>
  )
}
