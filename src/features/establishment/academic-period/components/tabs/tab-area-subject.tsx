"use no memo"

import { useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"
import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { SearchInput } from "@/features/establishment/academic-period/common/search-input"
import { NoticeOutlet } from "@/components/notice/notice-context"
import { columns } from "@/features/establishment/academic-period/components/table/columns-area-subject"
import { CreateAreaSubjectDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-area-subject"
import { DeleteSelectedAreaSubjectsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-selected-area-subjects"
import { ExportAreaSubjectsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-area-subjects"
import { ExportSelectedAreaSubjectsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-selected-area-subjects"
import { useAreaSubjectQuery } from "@/features/establishment/academic-period/api/query/use-area-subject"

interface TabAreaSubjectProps {
  academicPeriodId?: number
}

export function TabAreaSubject({ academicPeriodId }: TabAreaSubjectProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState("")

  const queryFilters = useMemo(() => ({ nombreInterno: search.trim() || undefined }), [search])

  const { data, isPending, isError, refetch } = useAreaSubjectQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
    academicPeriodId,
  })

  const goToPage = setPageIndex
  const changePageSize = (size: number) => {
    setPageSize(size)
    setPageIndex(0)
  }

  const { table, selectedIds, hasSelection, resetSelection } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => String(row.codigo),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize: changePageSize,
    sorting,
    setSorting,
  })

  return (
    <>
      {/* El `border-b` cierra la barra de acciones igual que el `hr` de
          `TableScreenHeader` en las pantallas de listado. */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
        <SearchInput
          id="area-subject-search"
          placeholder="Buscar por"
          value={search}
          onValueChange={(value) => {
            setSearch(value)
            setPageIndex(0)
          }}
        />

        <div className="flex gap-2">
          {hasSelection && (
            <DeleteSelectedAreaSubjectsDialog
              selectedIds={selectedIds}
              resetSelection={resetSelection}
            />
          )}
          {hasSelection ? (
            <ExportSelectedAreaSubjectsDialog
              selectedIds={selectedIds.map(Number)}
              resetSelection={resetSelection}
            />
          ) : (
            <>
              <CreateAreaSubjectDialog academicPeriodId={academicPeriodId} />
              <ExportAreaSubjectsDialog filters={queryFilters} />
            </>
          )}
        </div>
      </div>

      <NoticeOutlet className="mb-2" />

      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Aún no hay periodos de evaluación."
        errorMessage="Ocurrió un error al cargar los periodos de evaluación."
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
          onPageSizeChange={changePageSize}
        />
      )}
    </>
  )
}
