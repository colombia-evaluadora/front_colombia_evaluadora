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
import { useSedeJornadasActivasQuery } from "@/features/establishment/employees/api/query/use-sede-jornadas"
import { SeguimientoSummaryCards } from "@/features/academic-management/asistencia/components/seguimiento-summary-cards"
import { columnsSeguimiento } from "@/features/academic-management/asistencia/components/columns-seguimiento"
import { SearchSeguimiento } from "@/features/academic-management/asistencia/components/search/search-seguimiento"
import { catalogosDeSesiones, EMPTY_SEGUIMIENTO_FILTERS } from "@/features/academic-management/asistencia/api/ui-mappings"
import type { SeguimientoFiltersValues, TipoAsistencia } from "@/features/academic-management/asistencia/api/types/asistencia"

/**
 * Seguimiento es una foto de UN día -- el que se estaba viendo en
 * Asistencia al entrar (viaja como `?fecha=` en la URL, ver
 * `asistenciaSeguimientoSearchSchema`), no un histórico suelto. Sin esa
 * fecha (entrar directo a la URL) no se consulta nada: mostrar de entrada
 * todos los registros de todos los días no es lo que pide la pantalla.
 */
function SeguimientoSinFecha({ sede }: { sede: number | undefined }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <CalendarBlankIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="max-w-sm text-sm text-muted-foreground">
        Seguimiento muestra los registros de un día puntual. Entra desde Asistencia eligiendo el día que
        querés revisar.
      </p>
      <Button
        type="button"
        variant="outline"
        color="neutral"
        size="sm"
        render={<Link to={paths.app.asistencia.getHref()} search={{ sede }} />}
        nativeButton={false}
      >
        Ir a Asistencia
      </Button>
    </div>
  )
}

/**
 * Sin ningún filtro puesto (ni texto libre ni ninguno de los selects) no se
 * llama al endpoint ni se muestra nada -- mostrar de entrada TODOS los
 * registros del día sería la tabla completa del colegio, que es justo lo
 * que "Seguimiento" busca evitar.
 */
function SeguimientoSinFiltro() {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <FunnelIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="max-w-sm text-sm text-muted-foreground">
        Aplica al menos un filtro (búsqueda, jornada, grado, grupo, asignatura o tipo de asistencia) para
        ver los registros de este día.
      </p>
    </div>
  )
}

function SeguimientoTable({ fecha, sede }: { fecha: string; sede: number }) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState<SeguimientoFiltersValues>(EMPTY_SEGUIMIENTO_FILTERS)

  // Catálogos de Grado/Grupo/Asignatura del panel de filtros: se derivan de
  // las sesiones REALES que esta sede dicta en el mes de `fecha` (mismas
  // que ve el calendario de Asistencia) -- no una lista fija sin relación
  // con la sede elegida (ver `catalogosDeSesiones`).
  const [anio, mes] = fecha.split("-").map(Number)
  const { data: sesionesDelMes } = useAsistenciaCalendarioQuery({ SEDE: sede, ANIO: anio, MES: mes })
  const { grupos: grupoCatalog, asignaturasPorGrupo } = React.useMemo(
    () => catalogosDeSesiones(sesionesDelMes ?? []),
    [sesionesDelMes],
  )

  // Jornada sale aparte, de `fn_jornadas_activas_por_sede` (real) -- el
  // calendario no manda jornada por sesión (ver nota en `ui-mappings.ts`).
  const { data: jornadasActivas } = useSedeJornadasActivasQuery(sede)
  const jornadaOptions = React.useMemo(
    () => (jornadasActivas ?? []).map((j) => ({ value: j.nombre, label: j.nombre })),
    [jornadasActivas],
  )

  // Sin ningún filtro puesto no se consulta nada -- ver `SeguimientoSinFiltro`.
  // `filters.grado` alcanza para detectar la cadena grado→asignatura
  // activa: la validación de `SearchSeguimiento` ya garantiza que se aplica
  // completa o no se aplica.
  const hasFilter = Boolean(search || filters.jornada || filters.grado || filters.tipoAsistencia)

  const [primary] = sorting
  const { data, isPending, isError, refetch } = useAsistenciaSeguimientoQuery(
    {
      FILTERS: {
        FECHA_DESDE: fecha,
        FECHA_HASTA: fecha,
        SEARCH: search || null,
        JORNADA: filters.jornada || null,
        GRADO: filters.grado || null,
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
          asignaturasPorGrupo={asignaturasPorGrupo}
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
            <SeguimientoSummaryCards totalEstudiantes={totalEstudiantes} ausentes={ausentes} />
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
  const { fecha, sede } = asistenciaSeguimientoRoute.useSearch()

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
          {fecha ? (
            <TablePaginationProvider>
              <SeguimientoTable fecha={fecha} sede={sede ?? 0} />
            </TablePaginationProvider>
          ) : (
            <SeguimientoSinFecha sede={sede} />
          )}
        </TableScreenBody>
      </TableScreen>
    </NoticeProvider>
  )
}
