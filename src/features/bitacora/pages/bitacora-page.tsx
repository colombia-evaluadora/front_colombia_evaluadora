"use no memo"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { ExportDialog } from "@/components/export-dialog"
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
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { useUser } from "@/lib/auth"
import { parseDateValue } from "@/lib/date-value"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"
import { AuditViewTabs } from "@/features/administration/audits/components/audit-view-tabs"

import { exportarBitacora } from "@/features/bitacora/api/mutations/exportar-bitacora"
import { useBitacoraEstadoQuery } from "@/features/bitacora/api/query/use-bitacora-estado-query"
import { useBitacoraSedesQuery } from "@/features/bitacora/api/query/use-bitacora-sedes-query"
import { useJornadasQuery } from "@/features/establishment/academic-period/api/query/use-jornadas"
import { useBitacoraQuery } from "@/features/bitacora/api/query/use-bitacora-query"
import { BITACORA_MODULOS, moduloConSedeJornada, type BitacoraEvento } from "@/features/bitacora/api/types/bitacora"
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
  const esSuperAdmin = Boolean(user?.isSuperAdmin)
  const { filters: filtrosUrl, applyFilters, clearAllFilters, activeFilterCount } = useBitacoraFilters()
  const paginacion = useTablePagination()
  const [expandidoId, setExpandidoId] = useState<string | null>(null)
  const [restaurando, setRestaurando] = useState<BitacoraEvento | null>(null)

  // El Superadministrador consulta un establecimiento: sin elegido, el primero.
  const { data: establecimientos = [] } = useEstablishmentsOptionsQuery(esSuperAdmin)
  const filters = {
    ...filtrosUrl,
    establecimiento:
      filtrosUrl.establecimiento || (esSuperAdmin ? String(establecimientos[0]?.id ?? "") : ""),
  }
  const { modulo } = filters
  const { data: sedes = [] } = useBitacoraSedesQuery(filters.establecimiento)
  const { data: jornadas = [] } = useJornadasQuery()
  const esperaEstablecimiento = esSuperAdmin && modulo !== "ADMINISTRACION" && !filters.establecimiento

  const params = {
    filters,
    sorting: paginacion.sorting,
    pageIndex: paginacion.pageIndex,
    pageSize: paginacion.pageSize,
  }
  const { data, isPending, isError, error, refetch } = useBitacoraQuery(params, !esperaEstablecimiento)
  const eventos = data?.rows ?? []
  const pageCount = data?.pageCount ?? 0
  const { data: estados } = useBitacoraEstadoQuery(
    eventos.map((e) => e.id),
    filters.establecimiento,
  )

  const columns = createBitacoraColumns({
    conSedeJornada: moduloConSedeJornada(modulo),
    expandidoId,
    estados,
    onToggle: (e) => setExpandidoId((id) => (id === e.id ? null : e.id)),
  })
  const { table } = useDataTable({
    columns,
    data: eventos,
    pageCount,
    getRowId: (row) => row.id,
    ...paginacion,
    columnVisibilityStorageKey: "bitacora-column-visibility",
  })

  const establecimiento = establecimientos.find((e) => String(e.id) === filters.establecimiento)?.name
  // Dónde está parado el usuario: establecimiento, sede y jornada, y el rango.
  const sede = sedes.find((s) => String(s.id) === filters.sede)?.nombre
  const jornada = jornadas.find((j) => String(j.id) === filters.jornada)?.name
  const rango = `del ${fechaCorta(filters.desde)} al ${fechaCorta(filters.hasta)}`
  const alcance =
    modulo === "ADMINISTRACION"
      ? `Toda la plataforma, ${rango}`
      : !moduloConSedeJornada(modulo)
        ? [establecimiento, rango].filter(Boolean).join(", ")
        : [
            establecimiento,
            sede ? `sede ${sede}` : "todas las sedes",
            jornada ? `jornada ${jornada.toLowerCase()}` : "todas las jornadas",
            rango,
          ]
            .filter(Boolean)
            .join(", ")

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description={alcance}>Bitácora de {BITACORA_MODULOS[modulo]}</TableScreenTitle>
        <AuditViewTabs />
        <TableScreenToolbar>
          <SearchBitacora
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
            esSuperAdmin={esSuperAdmin}
          />
          <TableScreenActions>
            <ExportDialog
              label="Exportar la bitácora filtrada"
              disabled={eventos.length === 0}
              description="Elige un formato para exportar todos los registros de la bitácora que coincidan con la búsqueda y los filtros activos."
              onExport={(formato) => exportarBitacora(formato, params)}
            />
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
              <DetalleEvento
                evento={row.original as BitacoraEvento}
                estado={estados?.get(row.original.id)}
                onRestaurar={setRestaurando}
              />
            ) : null
          }
          emptyMessage="No hay registros de la bitácora que coincidan con la búsqueda y los filtros aplicados."
        />
        <Pagination
          viewOptions={<DataTableViewOptions table={table} />}
          pageIndex={paginacion.pageIndex}
          pageCount={pageCount}
          canPrev={paginacion.pageIndex > 0}
          canNext={paginacion.pageIndex < pageCount - 1}
          onPageChange={paginacion.goToPage}
          totalCount={data?.totalCount ?? 0}
          pageSize={paginacion.pageSize}
          onPageSizeChange={paginacion.setPageSize}
        />
      </TableScreenBody>

      <DialogRestaurarEvento
        modulo={modulo}
        establecimiento={filters.establecimiento}
        evento={restaurando}
        estado={restaurando ? estados?.get(restaurando.id) : undefined}
        onClose={() => setRestaurando(null)}
        onRestaurado={() => {
          setRestaurando(null)
          notify("Información restaurada. Se creó el evento Restauración.")
        }}
      />
    </TableScreen>
  )
}
