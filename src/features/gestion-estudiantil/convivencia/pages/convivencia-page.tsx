"use no memo"

import { Link, useNavigate } from "@tanstack/react-router"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { FileDownloadOutlinedIcon, ControlPointIcon } from "@/components/ui/icons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { useDataTable } from "@/hooks/use-data-table"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { paths } from "@/config/paths"

import { toConvivenciaFilters, useCasosQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import { useConvivenciaAccess } from "@/features/gestion-estudiantil/convivencia/api/use-convivencia-access"
import { resumenDeFila } from "@/features/gestion-estudiantil/convivencia/api/types"
import { buildColumnsCasos } from "@/features/gestion-estudiantil/convivencia/components/table/columns-casos"
import { SearchCasos } from "@/features/gestion-estudiantil/convivencia/components/search/search-casos"
import { useCasosFiltros, useGestoresDelListado } from "@/features/gestion-estudiantil/convivencia/hooks/use-casos-filtros"
import { useDialogosCaso } from "@/features/gestion-estudiantil/convivencia/components/dialogs/use-dialogos-caso"

function ConvivenciaContent() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const navigate = useNavigate()
  const access = useConvivenciaAccess()
  const { abrir, dialogos } = useDialogosCaso()

  const f = useCasosFiltros(goToPage)

  const { data, isPending, isError, error, refetch } = useCasosQuery({
    filters: toConvivenciaFilters(f.search, f.filtros),
    pageIndex,
    pageSize,
  })
  const rows = data?.rows ?? []
  const gestores = useGestoresDelListado(data?.rows)

  const columns = buildColumnsCasos({
    access,
    onAccion: (caso, accion) => {
      if (accion === "ver") navigate({ to: paths.app.convivenciaCaso.getHref(caso.id) })
      else if (accion === "modificar") navigate({ to: paths.app.convivenciaEditar.getHref(caso.id) })
      else abrir(accion, resumenDeFila(caso))
    },
  })

  const { table } = useDataTable({
    columns,
    data: rows,
    pageCount: data?.pageCount ?? 1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "convivencia-column-visibility",
  })

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex flex-wrap items-center gap-2">
              {/* 3.4: el reporte de apoyo para el SIUCE aún no tiene backend. */}
              <Button size="sm" variant="outline" color="neutral" disabled>
                <FileDownloadOutlinedIcon data-icon="inline-start" />
                Exportar para el SIUCE
              </Button>
              {access.puedeCrear && (
                <Button size="sm" render={<Link to={paths.app.convivenciaNuevo.getHref()} />} nativeButton={false}>
                  <ControlPointIcon data-icon="inline-start" />
                  Nuevo caso
                </Button>
              )}
            </div>
          }
        >
          Convivencia
        </TableScreenTitle>
        <Tabs value="casos" className="px-(--screen-spacing)">
          <TabsList variant="line" className="w-full justify-start border-b border-border">
            <TabsTrigger value="casos" className="flex-none px-3">
              Casos
            </TabsTrigger>
            {/* Secciones 3.3 y 3.5: sin backend todavía. */}
            <TabsTrigger value="comite" className="flex-none px-3" disabled>
              Comité
            </TabsTrigger>
            <TabsTrigger value="procesos" className="flex-none px-3" disabled>
              Procesos disciplinarios
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <TableScreenToolbar>
          <SearchCasos
            search={f.search}
            onSearchChange={f.onSearchChange}
            filters={f.filtros}
            applyFilters={f.applyFilters}
            onClearAll={f.onClearAll}
            onDraftChange={f.onDraftChange}
            opciones={{ ...f.opciones, gestores }}
          />
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          isRowMuted={(row) => row.original.estado_codigo === "ANULADO"}
          growColumnId="manifestacion"
          emptyMessage={f.hayFiltros ? "No hay casos para los filtros aplicados." : "Aún no hay casos de convivencia."}
          errorMessage={error ? getErrorMessage(error) : undefined}
        />
        <Pagination
          pageIndex={pageIndex}
          pageCount={data?.pageCount ?? 1}
          canPrev={pageIndex > 0}
          canNext={pageIndex < (data?.pageCount ?? 1) - 1}
          onPageChange={goToPage}
          totalCount={data?.totalCount ?? 0}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          viewOptions={<DataTableViewOptions table={table} />}
        />
      </TableScreenBody>

      {dialogos}
    </>
  )
}

/** Convivencia (Gestión Estudiantil 3.1): listado de casos del alcance del usuario. */
export function ConvivenciaPage() {
  return (
    <NoticeProvider>
      <TableScreen>
        <TablePaginationProvider>
          <ConvivenciaContent />
        </TablePaginationProvider>
      </TableScreen>
    </NoticeProvider>
  )
}
