"use no memo"

import { useNavigate, useSearch } from "@tanstack/react-router"

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
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDataTable } from "@/hooks/use-data-table"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { paths } from "@/config/paths"

import {
  toCitacionesFilters,
  useCitacionesQuery,
} from "@/features/gestion-estudiantil/citaciones/api/query/use-citaciones-query"
import {
  toCompromisosFilters,
  useCompromisosQuery,
} from "@/features/gestion-estudiantil/citaciones/api/query/use-compromisos-query"
import {
  buildColumnsCitaciones,
  COLUMNAS_CITACIONES_OCULTAS,
} from "@/features/gestion-estudiantil/citaciones/components/columns-citaciones"
import {
  buildColumnsCompromisos,
  COLUMNAS_COMPROMISOS_OCULTAS,
} from "@/features/gestion-estudiantil/citaciones/components/columns-compromisos"
import {
  useDialogosCitacion,
  useDialogosCompromiso,
} from "@/features/gestion-estudiantil/citaciones/components/dialogos/use-dialogos-citaciones"
import { SearchCitaciones } from "@/features/gestion-estudiantil/citaciones/components/search-citaciones"
import { SearchCompromisos } from "@/features/gestion-estudiantil/citaciones/components/search-compromisos"
import { useCitacionesAccess } from "@/features/gestion-estudiantil/citaciones/hooks/use-citaciones-access"
import {
  atiendenDelListado,
  useCitacionesFiltros,
  useCompromisosFiltros,
} from "@/features/gestion-estudiantil/citaciones/hooks/use-citaciones-filtros"

type Pestana = "citaciones" | "compromisos"

interface PestanaProps {
  cabecera: React.ReactNode
}

function PestanaCitaciones({ cabecera }: PestanaProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const permisos = useCitacionesAccess()
  const f = useCitacionesFiltros(goToPage)

  const { data, isPending, isError, error, refetch } = useCitacionesQuery({
    filters: toCitacionesFilters(f.search, f.filtros),
    pageIndex,
    pageSize,
  })

  const navigate = useNavigate() as unknown as Navegar
  const dialogosCitacion = useDialogosCitacion()

  const columns = buildColumnsCitaciones({
    permisos,
    onAccion: (citacion, accion) => {
      if (accion === "compromiso")
        navigate({ to: paths.app.compromisoNuevo.getHref(), search: { citacion: citacion.id } })
      else dialogosCitacion.abrir(accion, citacion)
    },
  })

  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? 1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "citaciones-column-visibility",
    initialColumnVisibility: COLUMNAS_CITACIONES_OCULTAS,
  })

  return (
    <>
      <TableScreenHeader>
        {cabecera}
        <TableScreenToolbar>
          <SearchCitaciones
            search={f.search}
            onSearchChange={f.onSearchChange}
            filters={f.filtros}
            applyFilters={f.applyFilters}
            onClearAll={f.onClearAll}
            onDraftChange={f.onDraftChange}
            opciones={{ ...f.opciones, atienden: atiendenDelListado(data?.rows) }}
          />
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          isRowMuted={(row) => row.original.estado_valor === "CANCELADA"}
          emptyMessage={f.hayFiltros ? "No hay citaciones para los filtros aplicados." : "Aún no hay citaciones."}
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
      {dialogosCitacion.dialogos}
    </>
  )
}

function PestanaCompromisos({ cabecera }: PestanaProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const permisos = useCitacionesAccess()
  const f = useCompromisosFiltros(goToPage)

  const { data, isPending, isError, error, refetch } = useCompromisosQuery({
    filters: toCompromisosFilters(f.search, f.filtros),
    pageIndex,
    pageSize,
  })

  const navigate = useNavigate() as unknown as Navegar
  const dialogosCompromiso = useDialogosCompromiso()

  const columns = buildColumnsCompromisos({
    permisos,
    onAccion: (compromiso, accion) => {
      if (accion === "ver") navigate({ to: paths.app.compromisoDetalle.getHref(compromiso.id), search: {} })
      else dialogosCompromiso.abrir(accion, compromiso)
    },
  })

  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? 1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "compromisos-column-visibility",
    initialColumnVisibility: COLUMNAS_COMPROMISOS_OCULTAS,
  })

  return (
    <>
      <TableScreenHeader>
        {cabecera}
        <TableScreenToolbar>
          <SearchCompromisos
            search={f.search}
            onSearchChange={f.onSearchChange}
            filters={f.filtros}
            applyFilters={f.applyFilters}
            onClearAll={f.onClearAll}
            onDraftChange={f.onDraftChange}
            opciones={f.opciones}
          />
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage={f.hayFiltros ? "No hay compromisos para los filtros aplicados." : "Aún no hay compromisos."}
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
      {dialogosCompromiso.dialogos}
    </>
  )
}

type Navegar = (opts: { to: string; search: Record<string, unknown>; replace?: boolean }) => void

function CitacionesCompromisosContent() {
  const permisos = useCitacionesAccess()
  const search = useSearch({ strict: false }) as { tab?: Pestana }
  const navigate = useNavigate() as unknown as Navegar
  const pestana: Pestana = search.tab === "compromisos" ? "compromisos" : "citaciones"

  // Las pestañas viven en la URL; cambiar de una a otra reinicia la paginación.
  const irA = (tab: Pestana) => navigate({ to: paths.app.citacionesCompromisos.getHref(), search: { tab } })

  const cabecera = (
    <>
      <TableScreenTitle
        action={
          <Button
            size="sm"
            disabled={!permisos.puedeCrear}
            onClick={() =>
              navigate({
                to:
                  pestana === "citaciones"
                    ? paths.app.citacionNueva.getHref()
                    : paths.app.compromisoNuevo.getHref(),
                search: {},
              })
            }
          >
            <ControlPointIcon data-icon="inline-start" />
            {pestana === "citaciones" ? "Nueva citación" : "Nuevo compromiso"}
          </Button>
        }
      >
        Citaciones y compromisos
      </TableScreenTitle>
      <Tabs value={pestana} onValueChange={(v) => irA(v as Pestana)} className="px-(--screen-spacing)">
        <TabsList>
          <TabsTrigger value="citaciones">Citaciones</TabsTrigger>
          <TabsTrigger value="compromisos">Compromisos</TabsTrigger>
        </TabsList>
      </Tabs>
    </>
  )

  return pestana === "compromisos" ? <PestanaCompromisos cabecera={cabecera} /> : <PestanaCitaciones cabecera={cabecera} />
}

/** Citaciones y compromisos (Gestión Estudiantil 4.1 y 4.2): citaciones al acudiente y sus compromisos. */
export function CitacionesCompromisosPage() {
  return (
    <NoticeProvider>
      <TableScreen>
        <TablePaginationProvider>
          <CitacionesCompromisosContent />
        </TablePaginationProvider>
      </TableScreen>
    </NoticeProvider>
  )
}
