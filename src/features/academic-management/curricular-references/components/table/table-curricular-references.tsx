"use no memo"

import { useMemo, useState } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { getErrorMessage } from "@/lib/api-client"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"

import { useCurricularReferencesFilters } from "@/features/academic-management/curricular-references/hooks/use-filters"
import { useCurricularReferencesQuery } from "@/features/academic-management/curricular-references/api/query/use-curricular-references"
import {
  createColumns,
  CURRICULAR_REFERENCES_EXPORT_COLUMN_KEYS,
} from "@/features/academic-management/curricular-references/components/table/columns"
import { SearchCurricularReferences } from "@/features/academic-management/curricular-references/components/search/search-curricular-references"
import { ManageCurricularReferenceDialog } from "@/features/academic-management/curricular-references/components/dialogs/dialog-manage"
import { ExportCurricularReferencesDialog } from "@/features/academic-management/curricular-references/components/dialogs/dialog-export"
import { useEducationLevelsQuery } from "@/features/academic-management/curricular-references/api/query/use-education-levels"
import { usePedagogicalApproachesQuery } from "@/features/academic-management/curricular-references/api/query/use-pedagogical-approaches"
import { useEvaluationTypesQuery } from "@/features/academic-management/curricular-references/api/query/use-evaluation-types"
import type { CurricularReference } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

export function CurricularReferencesDataTable() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()

  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useCurricularReferencesFilters()

  const { data: educationLevels = [] } = useEducationLevelsQuery()
  const { data: pedagogicalApproaches = [] } = usePedagogicalApproachesQuery()
  const { data: evaluationTypes = [] } = useEvaluationTypesQuery()

  const { data, isPending, isError, error, refetch } = useCurricularReferencesQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingReferenceId, setEditingReferenceId] = useState<number | null>(null)

  function openCreateDialog() {
    setEditingReferenceId(null)
    setEditorOpen(true)
  }

  function openEditDialog(reference: CurricularReference) {
    setEditingReferenceId(reference.id)
    setEditorOpen(true)
  }

  const columns = useMemo(() => createColumns({ onEdit: openEditDialog }), [])

  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-curricular-references-column-visibility",
  })

  // Columnas visibles, en orden, traducidas a claves del reporte: el archivo
  // sale con lo mismo que el usuario está viendo.
  const exportColumns = table
    .getVisibleLeafColumns()
    .flatMap((column) => CURRICULAR_REFERENCES_EXPORT_COLUMN_KEYS[column.id] ?? [])

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>Referentes curriculares</TableScreenTitle>
        <TableScreenToolbar>
          <SearchCurricularReferences
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
            educationLevels={educationLevels}
            pedagogicalApproaches={pedagogicalApproaches}
            evaluationTypes={evaluationTypes}
          />

          <TableScreenActions>
            <Button
              variant="fill"
              color="primary"
              size="sm"
              onClick={openCreateDialog}
              className="text-sm [&_svg:not([class*='size-'])]:size-4"
            >
              <ControlPointIcon data-icon="inline-start" />
              Nuevo referente
            </Button>
            <ExportCurricularReferencesDialog filters={queryFilters} sorting={sorting} columns={exportColumns} />
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          // Inactivo: visible y filtrable, pero atenuado (Regla 5).
          isRowMuted={(row) => !(row.original as CurricularReference).active}
          emptyMessage="Sin resultados."
          // El mensaje real del backend (403 -> "No tienes permisos para
          // realizar esta acción.", getErrorMessage lo resuelve solo) en vez
          // de un genérico fijo que no distinguía un error de permisos de
          // uno de red.
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

      <ManageCurricularReferenceDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        curricularReferenceId={editingReferenceId}
        educationLevels={educationLevels}
        pedagogicalApproaches={pedagogicalApproaches}
        evaluationTypes={evaluationTypes}
      />
    </TableScreen>
  )
}
