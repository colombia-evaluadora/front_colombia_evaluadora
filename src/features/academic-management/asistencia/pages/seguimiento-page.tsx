import * as React from "react"
import { Link } from "@tanstack/react-router"

import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { CalendarBlankIcon, FileDownloadOutlinedIcon, FunnelIcon } from "@/components/ui/icons"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { useDataTable } from "@/hooks/use-data-table"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"

import { paths } from "@/config/paths"
import { asistenciaSeguimientoRoute } from "@/router"
import { useAsistenciaSeguimientoQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-seguimiento-query"
import { useAsistenciaCalendarioQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-calendario-query"
import { useTipoAsistenciaCatalogQuery } from "@/features/academic-management/asistencia/api/query/use-tipo-asistencia-catalog-query"
import { SeguimientoSummaryCards } from "@/features/academic-management/asistencia/components/seguimiento-summary-cards"
import { columnsSeguimiento } from "@/features/academic-management/asistencia/components/columns-seguimiento"
import { SearchSeguimiento } from "@/features/academic-management/asistencia/components/search/search-seguimiento"
import { catalogosDeSesiones, EMPTY_SEGUIMIENTO_FILTERS } from "@/features/academic-management/asistencia/api/ui-mappings"
import type { SeguimientoFiltersValues, TipoAsistencia } from "@/features/academic-management/asistencia/api/types/asistencia"

function SeguimientoSinSede() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <CalendarBlankIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="max-w-sm text-sm text-muted-foreground">
        Seguimiento necesita una sede. Entra desde Asistencia eligiendo la sede que querés revisar.
      </p>
      <Button
        type="button"
        variant="outline"
        color="neutral"
        size="sm"
        render={<Link to={paths.app.asistencia.getHref()} />}
        nativeButton={false}
      >
        Ir a Asistencia
      </Button>
    </div>
  )
}

function SeguimientoSinFiltro() {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <FunnelIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="max-w-sm text-sm text-muted-foreground">
        Aplica al menos un filtro (búsqueda, rango de fecha, jornada, grado, grupo, asignatura o tipo de
        asistencia) para ver los registros.
      </p>
    </div>
  )
}

function SeguimientoTable({ sede }: { sede: number }) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState<SeguimientoFiltersValues>(EMPTY_SEGUIMIENTO_FILTERS)


  const hoy = React.useMemo(() => new Date(), [])
  const { data: sesionesDelMes } = useAsistenciaCalendarioQuery({
    SEDE: sede,
    ANIO: hoy.getFullYear(),
    MES: hoy.getMonth() + 1,
  })
  const {
    grupos: grupoCatalog,
    asignaturas: asignaturaCatalog,
    asignaturasPorGrupo,
    jornadas: jornadaOptions,
  } = React.useMemo(() => catalogosDeSesiones(sesionesDelMes ?? []), [sesionesDelMes])
  const { data: tipoAsistenciaOptions = [] } = useTipoAsistenciaCatalogQuery()


  const hasFilter = Boolean(
    search || filters.grupo || filters.asignatura || filters.tipoAsistencia || filters.fechaDesde || filters.fechaHasta,
  )

  const [primary] = sorting
  const { data, isPending, isError, refetch } = useAsistenciaSeguimientoQuery(
    {
      FILTERS: {
        FECHA_DESDE: filters.fechaDesde || null,
        FECHA_HASTA: filters.fechaHasta || null,
        SEARCH: search || null,
        GRUPO: filters.grupo ? Number(filters.grupo) : null,
        ASIGNATURA: filters.asignatura ? Number(filters.asignatura) : null,
        TIPO_ASISTENCIA: filters.tipoAsistencia ? (Number(filters.tipoAsistencia) as TipoAsistencia) : null,
      },
      SORTING: { ID: primary?.id ?? null, DESC: primary ? primary.desc : null },
      PAGEINDEX: pageIndex,
      PAGESIZE: pageSize,
    },
    sede,
    hasFilter,
  )

  const rows = data?.rows ?? []
  const totalCount = rows[0]?.total_count ?? 0
  const totalEstudiantes = rows[0]?.total_estudiantes
  const ausentes = rows[0]?.ausentes
  const tarde =
    rows[0]?.tarde ??
    (data
      ? new Set(
          rows.filter((r) => r.tipo_asistencia_valor === 5 || r.tipo_asistencia_valor === 6).map((r) => r.documento),
        ).size
      : undefined)
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))

  const { table } = useDataTable({
    columns: columnsSeguimiento,
    data: rows,
    pageCount,
    getRowId: (row) => String(row.pk_tasistencia),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
  })

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchSeguimiento
          search={search}
          onSearchChange={(value) => {
            setSearch(value)
            goToPage(0)
          }}
          filters={filters}
          applyFilters={(next) => {
            setFilters(next)
            goToPage(0)
          }}
          onClearAll={() => {
            setSearch("")
            setFilters(EMPTY_SEGUIMIENTO_FILTERS)
            goToPage(0)
          }}
          jornadaOptions={jornadaOptions}
          grupoCatalog={grupoCatalog}
          asignaturaCatalog={asignaturaCatalog}
          asignaturasPorGrupo={asignaturasPorGrupo}
          tipoAsistenciaOptions={tipoAsistenciaOptions}
        />

        <Button
          type="button"
          variant="outline"
          color="neutral"
          size="icon-sm"
          aria-label="Exportar seguimiento"
          className="ml-auto"
        >
          <FileDownloadOutlinedIcon />
        </Button>
      </div>

      {hasFilter ? (
        <>
          <div className="mb-4">
            <SeguimientoSummaryCards totalEstudiantes={totalEstudiantes} ausentes={ausentes} tarde={tarde} />
          </div>

          <DataTable
            table={table}
            isPending={isPending}
            isError={isError}
            onRetry={refetch}
            emptyMessage="Sin registros de asistencia."
            errorMessage="Ocurrió un error al cargar el seguimiento."
          />

          {data && (
            <Pagination
              pageIndex={pageIndex}
              pageCount={pageCount}
              canPrev={pageIndex > 0}
              canNext={pageIndex < pageCount - 1}
              onPageChange={goToPage}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          )}
        </>
      ) : (
        <SeguimientoSinFiltro />
      )}
    </>
  )
}

/** Pantalla "Seguimiento" — listado paginado de registros de asistencia individuales de UN día. */
export function SeguimientoPage() {
  const { sede } = asistenciaSeguimientoRoute.useSearch()

  return (
    <NoticeProvider>
      <TableScreen>
        <TableScreenHeader>
          <TableScreenTitle
            action={
              <Button
                variant="outline"
                color="neutral"
                size="icon-sm"
                aria-label="Ir a Asistencia"
                render={<Link to={paths.app.asistencia.getHref()} search={{ sede }} />}
                nativeButton={false}
              >
                <CalendarBlankIcon />
              </Button>
            }
          >
            Seguimiento
          </TableScreenTitle>
          <NoticeOutlet className="mx-(--screen-spacing) my-4" />
        </TableScreenHeader>

        <TableScreenBody>
          {sede ? (
            <TablePaginationProvider>
              <SeguimientoTable sede={sede} />
            </TablePaginationProvider>
          ) : (
            <SeguimientoSinSede />
          )}
        </TableScreenBody>
      </TableScreen>
    </NoticeProvider>
  )
}
