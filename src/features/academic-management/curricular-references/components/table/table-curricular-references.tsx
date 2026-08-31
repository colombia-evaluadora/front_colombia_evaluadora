"use no memo"

import { useMemo, useState } from "react"

import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
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
import { createColumns } from "@/features/academic-management/curricular-references/components/table/columns"
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

  const { data, isPending, isError, refetch } = useCurricularReferencesQuery({
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
  })

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
              Agregar referente
            </Button>
            <ExportCurricularReferencesDialog filters={queryFilters} />
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage="Sin resultados."
          errorMessage="Ocurrió un error al cargar los referentes curriculares."
        />

        {data && (
          <Pagination
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
