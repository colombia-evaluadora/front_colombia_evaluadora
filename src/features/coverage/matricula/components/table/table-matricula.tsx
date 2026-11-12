"use no memo"

import { useMatriculaCatalogQuery } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
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
import { useMatriculaGradeLabel } from "@/features/coverage/matricula/hooks/use-matricula-grade-label"
import { useMatriculaDependentCatalogsQuery } from "@/features/coverage/matricula/api/query/use-matricula-dependent-catalogs-query"
import { useMatriculaPeriodosAbiertosQuery } from "@/features/coverage/matricula/api/query/use-matricula-periodos-abiertos"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { XIcon } from "@/components/ui/icons"
import { SearchMatricula } from "@/features/coverage/matricula/components/search/search-matricula"
import { ExportMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-export-matricula"
import { ExportSelectedMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-export-selected-matricula"
import { ModificarMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-modificar-matricula"

interface MatriculaDataTableProps {
  title: ReactNode
  action?: ReactNode
  titleAction?: ReactNode
}

export function MatriculaDataTable({ title, action, titleAction }: MatriculaDataTableProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()

  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useMatriculaFilters()

  const { data, isPending, isError, error, refetch } = useMatriculaQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const { table, selectedIds: selectedRowIds, selectedRows, hasSelection, resetSelection } = useDataTable({
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
    columnVisibilityStorageKey: "table-matricula-column-visibility-v2",
    initialColumnVisibility: MATRICULA_INITIAL_VISIBILITY,
  })
  const gradeLabel = useMatriculaGradeLabel()
  // Para el texto del chip del periodo ("2027 · Anual · Ciclo 1").
  const { sedeId, jornadaId } = useMatriculaDependentCatalogsQuery({
    campus: filters.campus || undefined,
    shift: filters.shift || undefined,
    periodoId: filters.periodo ? Number(filters.periodo) : null,
  })
  const { data: metodologias } = useMatriculaCatalogQuery("metodologia")
  const { data: periodos = [] } = useMatriculaPeriodosAbiertosQuery(
    filters.periodo ? sedeId : null,
    filters.periodo ? jornadaId : null,
  )

  function deselectRow(id: string) {
    // Sobre el estado: la fila puede estar en otra página.
    table.setRowSelection(({ [id]: _, ...rest }) => rest)
  }

  const exportColumns = table
    .getVisibleLeafColumns()
    .flatMap((column) => MATRICULA_EXPORT_COLUMN_KEYS[column.id] ?? [])

  // Chips de filtros activos (prototipo C.1.LIS): quitar uno reaplica el resto.
  type Chip = { key: string; label: string; clear: () => void }
  const chips = [
    filters.campus && { key: "campus", label: filters.campus, clear: () => applyFilters({ ...filters, campus: "" }) },
    filters.shift && { key: "shift", label: filters.shift, clear: () => applyFilters({ ...filters, shift: "" }) },
    filters.periodo && {
      key: "periodo",
      label: periodos.find((p) => p.value === filters.periodo)?.label ?? "Período",
      // El grado y el grupo cuelgan del periodo.
      clear: () => applyFilters({ ...filters, periodo: "", grade: "", group: "" }),
    },
    filters.grade && { key: "grade", label: gradeLabel(Number(filters.grade)), clear: () => applyFilters({ ...filters, grade: "" }) },
    filters.group && { key: "group", label: `Grupo ${filters.group}`, clear: () => applyFilters({ ...filters, group: "" }) },
    filters.tipo && {
      key: "tipo",
      label: filters.tipo === "COMPLEMENTARIA" ? "Complementaria" : "Principal",
      clear: () => applyFilters({ ...filters, tipo: "" }),
    },
    filters.metodologia && {
      key: "metodologia",
      label: metodologias?.find((m) => String(m.id) === filters.metodologia)?.nombre ?? "Metodología",
      clear: () => applyFilters({ ...filters, metodologia: "" }),
    },
    filters.solicitud && {
      key: "solicitud",
      label: "Con solicitud pendiente",
      clear: () => applyFilters({ ...filters, solicitud: "" }),
    },
    ...filters.statuses.map((status) => ({
      key: `status-${status}`,
      label: status,
      clear: () => applyFilters({ ...filters, statuses: filters.statuses.filter((s) => s !== status) }),
    })),
  ].filter((chip): chip is Chip => Boolean(chip))

  const selectedCount = selectedRowIds.length

  return (
    <NoticeProvider>
      <TableScreen>
        <TableScreenHeader>
          <TableScreenTitle action={titleAction}>{title}</TableScreenTitle>
          <AvisoSolicitudesRetiro
            filtrando={filters.solicitud === "CON_SOLICITUD"}
            onFiltrar={() => applyFilters({ ...filters, solicitud: "CON_SOLICITUD" })}
          />
          {hasSelection ? (
            <TableScreenToolbar>
              {/* La selección reemplaza la barra: las acciones masivas quedan solas a la vista. */}
              <div className="flex w-full flex-wrap items-center gap-2 rounded-md bg-primary-22 p-3">
                <span className="mr-2 text-sm font-medium tabular-nums">
                  {selectedCount === 1 ? "1 seleccionado" : `${selectedCount} seleccionados`}
                </span>
                <Button type="button" variant="ghost" color="primary" size="sm" onClick={resetSelection}>
                  <XIcon data-icon="inline-start" />
                  Quitar selección
                </Button>
                <OnlineOnlyAction>
                  <ModificarMatriculaDialog
                    selected={selectedRows}
                    onRemove={deselectRow}
                    resetSelection={resetSelection}
                  />
                </OnlineOnlyAction>
                <OnlineOnlyAction>
                  <ExportSelectedMatriculaDialog
                    selectedIds={selectedRowIds}
                    resetSelection={resetSelection}
                  />
                </OnlineOnlyAction>
              </div>
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
                <OnlineOnlyAction>
                  <ExportMatriculaDialog filters={queryFilters} columns={exportColumns} />
                </OnlineOnlyAction>
                {action}
              </TableScreenActions>

              {chips.length > 0 ? (
                <div className="flex w-full flex-wrap items-center gap-2">
                  {chips.map((chip) => (
                    <Badge key={chip.key} variant="soft" color="info" className="text-xs font-medium tracking-normal">
                      {chip.label}
                      <button
                        type="button"
                        aria-label={`Quitar filtro ${chip.label}`}
                        className="rounded-xs hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        onClick={chip.clear}
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    </Badge>
                  ))}
                  <Button type="button" variant="link" color="primary" size="sm" onClick={clearAllFilters}>
                    Limpiar filtros
                  </Button>
                </div>
              ) : null}
            </TableScreenToolbar>
          )}
        </TableScreenHeader>

        <TableScreenBody>
          {data ? (
            <p className="mb-3 text-sm text-muted-foreground tabular-nums">
              {data.totalCount === 1 ? "1 estudiante" : `${data.totalCount.toLocaleString("es-CO")} estudiantes`}
            </p>
          ) : null}
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
