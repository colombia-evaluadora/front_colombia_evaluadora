"use no memo"

import { useState } from "react"
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
import { NoticeProvider, queueNotice, useNotify } from "@/components/notice/notice-context"
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
import {
  DialogNuevaCitacion,
  type NuevaCitacionInicial,
} from "@/features/gestion-estudiantil/citaciones/components/dialogos/dialog-nueva-citacion"
import {
  DialogNuevoCompromiso,
  type NuevoCompromisoInicial,
} from "@/features/gestion-estudiantil/citaciones/components/dialogos/dialog-nuevo-compromiso"
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

function PestanaCitaciones({ cabecera, onNuevoCompromiso }: PestanaProps & { onNuevoCompromiso: (citacion: number) => void }) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const f = useCitacionesFiltros(goToPage)

  const { data, isPending, isError, error, refetch } = useCitacionesQuery({
    filters: toCitacionesFilters(f.search, f.filtros),
    pageIndex,
    pageSize,
  })

  const dialogosCitacion = useDialogosCitacion()

  const columns = buildColumnsCitaciones({
    onAccion: (citacion, accion) => {
      if (accion === "compromiso") onNuevoCompromiso(citacion.id)
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
  const f = useCompromisosFiltros(goToPage)

  const { data, isPending, isError, error, refetch } = useCompromisosQuery({
    filters: toCompromisosFilters(f.search, f.filtros),
    pageIndex,
    pageSize,
  })

  const navigate = useNavigate() as unknown as Navegar
  const dialogosCompromiso = useDialogosCompromiso()

  const columns = buildColumnsCompromisos({
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

interface ModalesIniciales {
  /** Ruta /nueva: el listado con Nueva citación ya abierta. */
  nuevaCitacion?: NuevaCitacionInicial
  /** Ruta /nuevo-compromiso: el listado con Nuevo compromiso ya abierto. */
  nuevoCompromiso?: NuevoCompromisoInicial
}

function CitacionesCompromisosContent({ nuevaCitacion, nuevoCompromiso }: ModalesIniciales) {
  const acceso = useCitacionesAccess()
  const { notify } = useNotify()
  // Desde el listado el modal se abre en el sitio; desde /nueva (Convivencia, Observador) llega ya abierto.
  const [citacion, setCitacion] = useState<NuevaCitacionInicial | null>(nuevaCitacion ?? null)
  const [compromiso, setCompromiso] = useState<NuevoCompromisoInicial | null>(nuevoCompromiso ?? null)
  const search = useSearch({ strict: false }) as { tab?: Pestana }
  const navigate = useNavigate() as unknown as Navegar
  const pestana: Pestana =
    search.tab === "compromisos" || (nuevoCompromiso && !search.tab) ? "compromisos" : "citaciones"

  // Las pestañas viven en la URL; cambiar de una a otra reinicia la paginación.
  const irA = (tab: Pestana) => navigate({ to: paths.app.citacionesCompromisos.getHref(), search: { tab } })

  // Al cerrar el modal abierto por la ruta /nueva se vuelve a la URL del listado.
  const cerrarCitacion = () => {
    setCitacion(null)
    if (nuevaCitacion) navigate({ to: paths.app.citacionesCompromisos.getHref(), search: { tab: "citaciones" }, replace: true })
  }
  const cerrarCompromiso = () => {
    setCompromiso(null)
    if (nuevoCompromiso) navigate({ to: paths.app.citacionesCompromisos.getHref(), search: { tab: "compromisos" }, replace: true })
  }
  const citacionCreada = (mensaje: string) => {
    if (nuevaCitacion) queueNotice(mensaje, { variant: "success" })
    else notify(mensaje, { variant: "success" })
    cerrarCitacion()
  }

  const cabecera = (
    <>
      <TableScreenTitle
        action={
          <Button
            size="sm"
            disabled={!(pestana === "citaciones" ? acceso.puedeCrearCitacion : acceso.puedeCrearCompromiso)}
            onClick={() =>
              pestana === "citaciones" ? setCitacion({}) : setCompromiso({})
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

  return (
    <>
      {pestana === "compromisos" ? <PestanaCompromisos cabecera={cabecera} /> : <PestanaCitaciones cabecera={cabecera} onNuevoCompromiso={(id) => setCompromiso({ citacion: id })} />}
      {citacion && <DialogNuevaCitacion {...citacion} onClose={cerrarCitacion} onCreada={citacionCreada} />}
      {compromiso && <DialogNuevoCompromiso {...compromiso} onClose={cerrarCompromiso} />}
    </>
  )
}

/** Citaciones y compromisos (Gestión Estudiantil 4.1 y 4.2): citaciones al acudiente y sus compromisos. */
export function CitacionesCompromisosPage({ nuevaCitacion, nuevoCompromiso }: ModalesIniciales = {}) {
  return (
    <NoticeProvider>
      <TableScreen>
        <TablePaginationProvider>
          <CitacionesCompromisosContent nuevaCitacion={nuevaCitacion} nuevoCompromiso={nuevoCompromiso} />
        </TablePaginationProvider>
      </TableScreen>
    </NoticeProvider>
  )
}
