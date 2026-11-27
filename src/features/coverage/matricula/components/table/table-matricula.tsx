"use no memo"

import { AvisoSolicitudesRetiro } from "@/features/coverage/matricula/components/aviso-solicitudes-retiro"
import type { ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { OnlineOnlyAction } from "@/components/offline/online-only-action"

import { useMatriculaFilters } from "@/features/coverage/matricula/hooks/use-matricula-filters"
import { useMatriculaQuery } from "@/features/coverage/matricula/api/query/use-matricula-query"
import { getErrorMessage } from "@/lib/api-client"
import {
  columnsMatricula,
  MATRICULA_EXPORT_COLUMN_KEYS,
  MATRICULA_INITIAL_VISIBILITY,
} from "@/features/coverage/matricula/components/table/columns-matricula"
import { Button } from "@/components/ui/button"
import { FunnelXIcon } from "@/components/ui/icons"
import { SearchMatricula } from "@/features/coverage/matricula/components/search/search-matricula"
import { ExportMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-export-matricula"
import { BarraLote } from "@/features/coverage/matricula/components/dialogs/acciones/barra-lote"

// Columnas del PDF del prototipo (LIS.5) que la tabla ofrece ocultas por defecto.
// Se exportan solo si el usuario las hace visibles (id de columna → clave del reporte).
const EXPORT_KEYS_EXTRA: Partial<Record<string, string | string[]>> = {
  tipoMatricula: "tipo_matricula",
  birthDate: "birth_date",
  address: "address",
  phone: "phone",
  guardianDetail: ["guardian_relationship", "guardian"],
  guardianEmail: "guardian_email",
  asignaturas: "asignaturas",
  soportes: "soportes",
}

interface MatriculaDataTableProps {
  title: ReactNode
  action?: ReactNode
  /** Acciones secundarias de la línea del buscador, antes de Exportar (p. ej. la configuración de parámetros). */
  accionesSecundarias?: ReactNode
}

export function MatriculaDataTable({ title, action, accionesSecundarias }: MatriculaDataTableProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()

  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useMatriculaFilters()

  const { data, isPending, isError, error, refetch } = useMatriculaQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const { table, selectedRows, hasSelection, resetSelection } = useDataTable({
    columns: columnsMatricula,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => row.id,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    // Clave nueva: la vista guardada con el diseño anterior mostraba todas las columnas.
    columnVisibilityStorageKey: "table-matricula-column-visibility-v3",
    initialColumnVisibility: MATRICULA_INITIAL_VISIBILITY,
  })

  const exportColumns = table
    .getVisibleLeafColumns()
    .flatMap((column) => MATRICULA_EXPORT_COLUMN_KEYS[column.id] ?? EXPORT_KEYS_EXTRA[column.id] ?? [])

  return (
    <NoticeProvider>
      <TableScreen>
        <TableScreenHeader>
          <TableScreenTitle>{title}</TableScreenTitle>
          <AvisoSolicitudesRetiro
            filtrando={filters.solicitud === "CON_SOLICITUD"}
            onFiltrar={() => applyFilters({ ...filters, solicitud: "CON_SOLICITUD" })}
          />
          {hasSelection ? (
            <TableScreenToolbar>
              {/* La selección reemplaza la barra: las acciones por lote quedan solas a la vista (C.1.LOT). */}
              <BarraLote selected={selectedRows} resetSelection={resetSelection} />
            </TableScreenToolbar>
          ) : (
            <TableScreenToolbar>
              <SearchMatricula
                filters={filters}
                applyFilters={applyFilters}
                clearAllFilters={clearAllFilters}
                activeFilterCount={activeFilterCount}
              />

              <TableScreenActions>
                {accionesSecundarias}
                <OnlineOnlyAction>
                  <ExportMatriculaDialog filters={queryFilters} columns={exportColumns} />
                </OnlineOnlyAction>
                {action}
              </TableScreenActions>

            </TableScreenToolbar>
          )}
        </TableScreenHeader>

        {/* Sin la línea «N estudiantes» sobre la tabla: el total ya está en el pie de la paginación (como en
            Observaciones y sugerencias). */}
        <TableScreenBody>
          <DataTable
            table={table}
            isPending={isPending}
            // Sin red, el refetch de lo guardado en el equipo falla: se sigue
            // mostrando la copia guardada (como en referentes curriculares).
            isError={isError && !data}
            onRetry={refetch}
            // Textos del informe (sección 2, Estado vacío).
            emptyMessage={
              activeFilterCount > 0 ? (
                <span className="inline-flex flex-col items-center gap-1">
                  No hay estudiantes que coincidan con la búsqueda y los filtros aplicados.
                  <Button type="button" variant="link" color="primary" size="sm" onClick={clearAllFilters}>
                    <FunnelXIcon data-icon="inline-start" />
                    Limpiar filtros
                  </Button>
                </span>
              ) : (
                "Aún no hay estudiantes matriculados. Use Agregar estudiante para matricular el primero."
              )
            }
            errorMessage={error ? getErrorMessage(error) : undefined}
          />

          {data && (
            <Pagination
              viewOptions={<DataTableViewOptions table={table} />}
              pageIndex={pageIndex}
              pageCount={data.pageCount}
              canPrev={pageIndex > 0}
              canNext={pageIndex < data.pageCount - 1}
              onPageChange={goToPage}
              totalCount={data.totalCount}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          )}
        </TableScreenBody>
      </TableScreen>
    </NoticeProvider>
  )
}
