"use no memo"

import * as React from "react"
import { Link } from "@tanstack/react-router"

import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { CalendarBlankIcon, FunnelIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { useDataTable } from "@/hooks/use-data-table"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"

import { paths } from "@/config/paths"
import { asistenciaSeguimientoRoute } from "@/router"
import { useAsistenciaSeguimientoQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-seguimiento-query"
import { useAsistenciaCalendarioQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-calendario-query"
import { useEsDocente } from "@/features/academic-management/asistencia/api/use-es-docente"
import {
  TIPOS_JUSTIFICADOS,
  useTipoAsistenciaCatalogQuery,
} from "@/features/academic-management/asistencia/api/query/use-tipo-asistencia-catalog-query"
import { SeguimientoSummaryCards } from "@/features/academic-management/asistencia/components/seguimiento-summary-cards"
import { columnsSeguimiento } from "@/features/academic-management/asistencia/components/columns-seguimiento"
import { SearchSeguimiento } from "@/features/academic-management/asistencia/components/search/search-seguimiento"
import { ExportSeguimientoDialog } from "@/features/academic-management/asistencia/components/dialog-export-seguimiento"
import {
  catalogosDeSesiones,
  EMPTY_SEGUIMIENTO_FILTERS,
  gradosDeJornada,
  nombreDeOpcion,
} from "@/features/academic-management/asistencia/api/ui-mappings"
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

function SeguimientoSinFiltroMensaje() {
  return (
    <span className="flex flex-col items-center gap-2 py-4">
      <FunnelIcon className="size-6 text-muted-foreground" aria-hidden="true" />
      <span className="font-medium text-foreground">Elegí al menos un filtro para ver los registros</span>
      <span className="max-w-lg whitespace-normal text-sm text-muted-foreground">
        Buscá por nombre, grupo o asignatura, o abrí el panel de filtros para acotar por rango de fecha,
        jornada, grado, grupo, asignatura o tipo de asistencia.
      </span>
    </span>
  )
}

function SeguimientoTable({ sede }: { sede: number }) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState<SeguimientoFiltersValues>(EMPTY_SEGUIMIENTO_FILTERS)


  const hoy = React.useMemo(() => new Date(), [])
  const esDocente = useEsDocente()
  const { data: sesionesDelMes } = useAsistenciaCalendarioQuery({
    SEDE: sede,
    ANIO: hoy.getFullYear(),
    MES: hoy.getMonth() + 1,
    MIAS: esDocente,
  })
  const {
    grupos: grupoCatalog,
    asignaturas: asignaturaCatalog,
    asignaturasPorGrupo,
    jornadas: jornadaOptions,
  } = React.useMemo(() => catalogosDeSesiones(sesionesDelMes ?? []), [sesionesDelMes])
  const { data: tipoAsistenciaCatalog = [] } = useTipoAsistenciaCatalogQuery()
  // El filtro no ofrece los "trajo justificación"; el catálogo completo sigue
  // intacto para editar un registro (dialog-editar-seguimiento).
  const tipoAsistenciaOptions = React.useMemo(
    () => tipoAsistenciaCatalog.filter((o) => !TIPOS_JUSTIFICADOS.includes(o.value)),
    [tipoAsistenciaCatalog],
  )


  const hasFilter = Boolean(
    search ||
      filters.jornada ||
      filters.grado ||
      filters.grupo ||
      filters.asignatura ||
      filters.tipoAsistencia ||
      filters.fechaDesde ||
      filters.fechaHasta,
  )

  const [primary] = sorting
  // Mismo objeto para el listado paginado y para el reporte (dialog-export-seguimiento):
  // el reporte lo genera reporting-service con la MISMA fn_asistencia_listar_seguimiento
  // sin paginar, así que tiene que ver exactamente lo que ve la tabla.
  const queryFilters = {
    SEDE: sede,
    FECHA_DESDE: filters.fechaDesde || null,
    FECHA_HASTA: filters.fechaHasta || null,
    SEARCH: search || null,
    JORNADA: nombreDeOpcion(jornadaOptions, filters.jornada),
    GRADO: nombreDeOpcion(gradosDeJornada(grupoCatalog, filters.jornada), filters.grado),
    GRUPO: filters.grupo ? Number(filters.grupo) : null,
    ASIGNATURA: filters.asignatura ? Number(filters.asignatura) : null,
    TIPO_ASISTENCIA: filters.tipoAsistencia ? (Number(filters.tipoAsistencia) as TipoAsistencia) : null,
  }
  const { data, isPending, isError, refetch } = useAsistenciaSeguimientoQuery(
    {
      FILTERS: queryFilters,
      SORTING: { ID: primary?.id ?? null, DESC: primary ? primary.desc : null },
      PAGEINDEX: pageIndex,
      PAGESIZE: pageSize,
    },
    hasFilter,
  )

  // Al quitar los filtros la query queda deshabilitada pero `placeholderData` conserva
  // la respuesta anterior: sin filtros la pantalla tiene que vaciarse igual.
  const resultado = hasFilter ? data : undefined
  const rows = resultado?.rows ?? []
  const totalCount = rows[0]?.total_count ?? 0
  // El esqueleto es solo para la espera real de la query; sin filtros o con respuesta
  // vacía los contadores son ceros de verdad, no un "cargando" permanente.
  // Las 4 llegan como ventanas sobre el set filtrado completo: calcularlas acá
  // las dejaría midiendo solo la página visible.
  const cargando = hasFilter && !resultado
  const totalEstudiantes = cargando ? undefined : (rows[0]?.total_estudiantes ?? 0)
  const asistieron = cargando ? undefined : (rows[0]?.asistieron ?? 0)
  const ausentes = cargando ? undefined : (rows[0]?.ausentes ?? 0)
  const tarde = cargando ? undefined : (rows[0]?.tarde ?? 0)
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
    columnVisibilityStorageKey: "seguimiento-column-visibility",
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

        <div className="ml-auto">
          <ExportSeguimientoDialog filters={queryFilters} />
        </div>
      </div>

      {/* Sin filtros la pantalla conserva la misma estructura (tarjetas + tabla) en estado
          vacío: se ve qué se va a obtener y, en la tabla, qué falta hacer para obtenerlo. */}
      <div className="mb-4">
        <SeguimientoSummaryCards
          totalEstudiantes={totalEstudiantes}
          asistieron={asistieron}
          ausentes={ausentes}
          tarde={tarde}
        />
      </div>

      <DataTable
        table={table}
        isPending={hasFilter && isPending}
        isError={hasFilter && isError}
        onRetry={refetch}
        emptyMessage={
          hasFilter ? "Sin registros de asistencia para los filtros aplicados." : <SeguimientoSinFiltroMensaje />
        }
        errorMessage="Ocurrió un error al cargar el seguimiento."
      />

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
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      color="neutral"
                      size="icon-sm"
                      aria-label="Ir a Asistencia"
                      render={<Link to={paths.app.asistencia.getHref()} search={{ sede }} />}
                      nativeButton={false}
                    />
                  }
                >
                  <CalendarBlankIcon />
                </TooltipTrigger>
                <TooltipContent>Ir a Asistencia</TooltipContent>
              </Tooltip>
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
