"use no memo"

import { useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { useGradesQuery } from "@/features/establishment/academic-period/api/query/use-grades"
import { createGradeColumns } from "@/features/establishment/academic-period/components/table/columns-grades"
import { CreateGradeDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-grade"
import { DeleteSelectedGradesDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-selected-grades"
import { ExportGradesDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-grades"
import { ExportSelectedGradesDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-selected-grades"
import { NoticeOutlet } from "@/components/notice/notice-context"
import type { Jornada } from "@/features/establishment/academic-period/components/schedule-data"

interface TabGradesProps {
  jornada: Jornada
  academicPeriodId?: number
}

export function TabGrades({ jornada, academicPeriodId }: TabGradesProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const { data, isPending, isError, refetch } = useGradesQuery({
    filters: {},
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

  const columns = useMemo(
    () => createGradeColumns({ jornada, academicPeriodId }),
    [jornada, academicPeriodId],
  )

  const { table, selectedIds, hasSelection, resetSelection } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize: changePageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "tab-grades-column-visibility",
  })

  const selectedGradeIds = useMemo(() => selectedIds.map(Number), [selectedIds])

  const namesById = useMemo(
    () => new Map((data?.rows ?? []).map((row) => [row.id, row.nombre])),
    [data],
  )

  return (
    <>
      <div className="mb-2 flex items-center justify-end gap-2 border-b border-border pb-2">
        {hasSelection ? (
          <>
            <DeleteSelectedGradesDialog
              selectedIds={selectedIds}
              namesById={namesById}
              resetSelection={resetSelection}
            />
            <ExportSelectedGradesDialog
              selectedIds={selectedGradeIds}
              resetSelection={resetSelection}
              academicPeriodId={academicPeriodId}
            />
          </>
        ) : (
          <>
            <CreateGradeDialog jornada={jornada} academicPeriodId={academicPeriodId} />
            <ExportGradesDialog academicPeriodId={academicPeriodId} />
          </>
        )}
      </div>

      <NoticeOutlet className="mb-2" />

      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Aún no hay grados."
        errorMessage="Ocurrió un error al cargar los grados."
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
