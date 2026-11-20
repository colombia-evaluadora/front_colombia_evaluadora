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
import { FilePdfIcon, FileXlsIcon, SpinnerIcon } from "@/components/ui/icons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { useUser } from "@/lib/auth"
import { parseDateValue } from "@/lib/date-value"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"

import { exportarBitacora } from "@/features/bitacora/api/mutations/exportar-bitacora"
import { useBitacoraEstadoQuery } from "@/features/bitacora/api/query/use-bitacora-estado-query"
import { useBitacoraSedesQuery } from "@/features/bitacora/api/query/use-bitacora-sedes-query"
import { useJornadasQuery } from "@/features/establishment/academic-period/api/query/catalogos-lista-valor"
import { useBitacoraQuery } from "@/features/bitacora/api/query/use-bitacora-query"
import {
  BITACORA_MODULOS,
  esVistaAccesos,
  moduloConSedeJornada,
  type BitacoraEvento,
} from "@/features/bitacora/api/types/bitacora"
import { createAccesoColumns } from "@/features/bitacora/components/columns-accesos"
import { createBitacoraColumns } from "@/features/bitacora/components/columns-bitacora"
import { DetalleEvento } from "@/features/bitacora/components/detalle-evento"
import { DialogRestaurarEvento } from "@/features/bitacora/components/dialog-restaurar-evento"
import { ResumenPorModulo } from "@/features/bitacora/components/resumen-por-modulo"
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
  const { filters: filtrosUrl, vista, setVista, applyFilters, clearAllFilters, activeFilterCount } = useBitacoraFilters()
  const [exportando, setExportando] = useState<"pdf" | "excel" | null>(null)
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
  // Administración del Sistema con la acción Acceso: tabla de accesos, sin pestañas ni detalle (B.7.LIS.1).
  const accesos = esVistaAccesos(modulo, filters.accion)
  const vistaActual = accesos ? "registros" : vista
  const { data: sedes = [] } = useBitacoraSedesQuery(filters.establecimiento)
  const { data: jornadas = [] } = useJornadasQuery()
  const esperaEstablecimiento = esSuperAdmin && modulo !== "ADMINISTRACION" && !filters.establecimiento

  const params = {
    filters,
    sorting: paginacion.sorting,
    pageIndex: paginacion.pageIndex,
    pageSize: paginacion.pageSize,
    verSistema: esSuperAdmin,
  }
  const { data, isPending, isError, error, refetch } = useBitacoraQuery(params, !esperaEstablecimiento && vistaActual === "registros")
  const eventos = data?.rows ?? []
  const pageCount = data?.pageCount ?? 0
  const { data: estados } = useBitacoraEstadoQuery(
    eventos.map((e) => e.id),
    filters.establecimiento,
  )

  const columns = accesos
    ? createAccesoColumns()
    : createBitacoraColumns({
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
    columnVisibilityStorageKey: accesos ? "bitacora-accesos-column-visibility" : "bitacora-column-visibility",
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

  // B.1.LIS.1: dos botones, en la línea del buscador. La descarga respeta la búsqueda y los filtros activos.
  async function exportar(formato: "pdf" | "excel") {
    setExportando(formato)
    try {
      const r = await exportarBitacora(formato, params)
      notify(r.message, { variant: r.status === "ok" ? "success" : "error" })
    } finally {
      setExportando(null)
    }
  }
  const botonExportar = (formato: "pdf" | "excel") => (
    <Button
      size="sm"
      variant="outline"
      color="neutral"
      // En el Resumen no se exporta: descargaría los registros y el resumen aún no tiene reporte en el backend.
      disabled={exportando !== null || vistaActual === "resumen" || eventos.length === 0}
      onClick={() => exportar(formato)}
    >
      {exportando === formato ? (
        <SpinnerIcon data-icon="inline-start" className="animate-spin" />
      ) : formato === "pdf" ? (
        <FilePdfIcon data-icon="inline-start" />
      ) : (
        <FileXlsIcon data-icon="inline-start" />
      )}
      {formato === "pdf" ? "Exportar PDF" : "Exportar Excel"}
    </Button>
  )

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description={alcance}>
          Bitácora · {vistaActual === "resumen" ? "Resumen por módulo" : BITACORA_MODULOS[modulo]}
        </TableScreenTitle>
        {/* B.1.LIS.1 / B.1.LIS.1a: las pestañas van arriba, antes del buscador (como en el prototipo). */}
        {!accesos && (
          <Tabs className="px-(--screen-spacing)" value={vista} onValueChange={(v) => setVista(v as "registros" | "resumen")}>
            <TabsList>
              <TabsTrigger value="registros">Registros</TabsTrigger>
              <TabsTrigger value="resumen">Resumen por módulo</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <TableScreenToolbar>
          <SearchBitacora
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
            esSuperAdmin={esSuperAdmin}
          />
          {/* Exportar en la línea del buscador, a la derecha. */}
          <TableScreenActions>
            {botonExportar("pdf")}
            {botonExportar("excel")}
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        {vistaActual === "resumen" ? (
          <ResumenPorModulo filters={filters} enabled={!esperaEstablecimiento} />
        ) : (
        <>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          renderSubRow={(row) =>
            !accesos && expandidoId === row.original.id ? (
              <DetalleEvento
                evento={row.original as BitacoraEvento}
                modulo={modulo}
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
        </>
        )}
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
