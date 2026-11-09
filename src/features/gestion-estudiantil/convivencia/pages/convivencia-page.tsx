"use no memo"

import { useState } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { useDataTable } from "@/hooks/use-data-table"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { paths } from "@/config/paths"

import { toConvivenciaFilters, useCasosQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import { usePeriodosComiteQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-comite-query"
import { useCitacionesAccess } from "@/features/gestion-estudiantil/citaciones/hooks/use-citaciones-access"
import { useConvivenciaAccess } from "@/features/gestion-estudiantil/convivencia/api/use-convivencia-access"
import { resumenDeFila } from "@/features/gestion-estudiantil/convivencia/api/types"
import {
  CabeceraConvivencia,
  type PestanaConvivencia,
} from "@/features/gestion-estudiantil/convivencia/components/cabecera-convivencia"
import { toProcesosFilters, useProcesosQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-procesos-query"
import { resumenDeProceso, type ProcesoResumen } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { buildColumnsProcesos } from "@/features/gestion-estudiantil/convivencia/components/procesos/columns-procesos"
import { DialogAnularProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialog-anular-proceso"
import { SearchProcesos } from "@/features/gestion-estudiantil/convivencia/components/procesos/search-procesos"
import { useDialogosProceso } from "@/features/gestion-estudiantil/convivencia/hooks/use-dialogos-proceso"
import { useProcesosFiltros } from "@/features/gestion-estudiantil/convivencia/hooks/use-procesos-filtros"
import { TabComite } from "@/features/gestion-estudiantil/convivencia/components/comite/tab-comite"
import { DialogExportarSiuce } from "@/features/gestion-estudiantil/convivencia/components/dialogs/dialog-exportar-siuce"
import { buildColumnsCasos } from "@/features/gestion-estudiantil/convivencia/components/table/columns-casos"
import { SearchCasos } from "@/features/gestion-estudiantil/convivencia/components/search/search-casos"
import { useCasosFiltros, useGestoresDelListado } from "@/features/gestion-estudiantil/convivencia/hooks/use-casos-filtros"
import { useDialogosCaso } from "@/features/gestion-estudiantil/convivencia/components/dialogs/use-dialogos-caso"
import { periodoPorDefecto } from "@/features/gestion-estudiantil/convivencia/utils/comite"

interface PestanaProps {
  cabecera: (periodoComite?: number) => React.ReactNode
}

function PestanaCasos({ cabecera }: PestanaProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const navigate = useNavigate()
  const access = useConvivenciaAccess()
  const { puedeCrear: puedeCitar } = useCitacionesAccess()
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
    puedeCitar,
    onAccion: (caso, accion) => {
      if (accion === "citar" || accion === "compromiso")
        navigate({
          to: accion === "citar" ? paths.app.citacionNueva.getHref() : paths.app.compromisoNuevo.getHref(),
          search: { origen_tipo: "CASO_CONVIVENCIA", origen_id: caso.id },
        } as never)
      else if (accion === "ver") navigate({ to: paths.app.convivenciaCaso.getHref(caso.id) })
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
        {cabecera()}
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

function PestanaProcesos({ cabecera }: PestanaProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const navigate = useNavigate()
  const [anulando, setAnulando] = useState<ProcesoResumen | null>(null)
  const { abrir: abrirEtapa, dialogos: dialogosEtapa } = useDialogosProceso()

  const f = useProcesosFiltros(goToPage)

  const { data, isPending, isError, error, refetch } = useProcesosQuery({
    filters: toProcesosFilters(f.search, f.filtros),
    pageIndex,
    pageSize,
  })

  const columns = buildColumnsProcesos({
    onAccion: (proceso, accion) => {
      if (accion === "ver") navigate({ to: paths.app.convivenciaProceso.getHref(proceso.id) })
      else if (accion === "anular") setAnulando(resumenDeProceso(proceso))
      else abrirEtapa(accion, proceso.id)
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
    columnVisibilityStorageKey: "convivencia-procesos-column-visibility",
    initialColumnVisibility: COLUMNAS_PROCESOS_OCULTAS,
  })

  return (
    <>
      <TableScreenHeader>
        {cabecera()}
        <TableScreenToolbar>
          <SearchProcesos
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
          isRowMuted={(row) => row.original.estado_codigo === "ANULADO"}
          emptyMessage={
            f.hayFiltros ? "No hay procesos para los filtros aplicados." : "Aún no hay procesos disciplinarios."
          }
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

      <DialogAnularProceso proceso={anulando} onClose={() => setAnulando(null)} />
      {dialogosEtapa}
    </>
  )
}

function PestanaComite({ cabecera, periodo, onPeriodoChange }: PestanaProps & { periodo?: number; onPeriodoChange: (p: number) => void }) {
  const periodos = usePeriodosComiteQuery()
  // Los botones del encabezado apuntan al período que se está viendo (el elegido o el abierto).
  const lista = periodos.data ?? []
  const actual = lista.find((p) => p.fk_periodo === periodo) ?? periodoPorDefecto(lista)
  return (
    <>
      <TableScreenHeader>{cabecera(actual?.fk_periodo)}</TableScreenHeader>
      <TableScreenBody>
        <div className="px-(--screen-spacing) pt-4">
          <TabComite periodo={periodo} onPeriodoChange={onPeriodoChange} />
        </div>
      </TableScreenBody>
    </>
  )
}

type Navegar = (opts: { to: string; search: Record<string, unknown>; replace?: boolean }) => void

function ConvivenciaContent() {
  const access = useConvivenciaAccess()
  const search = useSearch({ strict: false }) as { tab?: PestanaConvivencia; periodo?: number }
  const navigate = useNavigate() as unknown as Navegar
  const [exportarAbierto, setExportarAbierto] = useState(false)

  // Sin permiso para ver el Comité, la pestaña queda deshabilitada y se vuelve a Casos.
  const pestana: PestanaConvivencia =
    search.tab === "comite" && access.puedeVerComite ? "comite" : search.tab === "procesos" ? "procesos" : "casos"
  const irA = (tab: PestanaConvivencia, periodo?: number) =>
    navigate({ to: paths.app.convivencia.getHref(), search: { tab, ...(periodo != null && { periodo }) } })

  const cabecera = (periodoComite?: number) => (
    <CabeceraConvivencia
      pestana={pestana}
      onPestana={(p) => irA(p, p === "comite" ? search.periodo : undefined)}
      access={access}
      periodo={periodoComite}
      onExportarSiuce={() => setExportarAbierto(true)}
    />
  )

  return (
    <>
      {pestana === "comite" ? (
        <PestanaComite cabecera={cabecera} periodo={search.periodo} onPeriodoChange={(p) => irA("comite", p)} />
      ) : pestana === "procesos" ? (
        <PestanaProcesos cabecera={cabecera} />
      ) : (
        <PestanaCasos cabecera={cabecera} />
      )}
      {access.puedeExportarSiuce && <DialogExportarSiuce open={exportarAbierto} onOpenChange={setExportarAbierto} />}
    </>
  )
}

/** Convivencia (Gestión Estudiantil 3.1 y 3.3): casos del alcance del usuario y Comité de Convivencia. */
/** Sede y Jornada siguen disponibles en «Columnas», pero arrancan ocultas (G.2.PRD.LIS.1). */
const COLUMNAS_PROCESOS_OCULTAS = { sede: false, jornada: false }

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
