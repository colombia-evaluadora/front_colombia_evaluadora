"use no memo"

import { useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { useEvaluationPeriodsQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-periods"
import { createEvaluationPeriodColumns } from "@/features/establishment/academic-period/components/table/columns-evaluation-periods"
import { CreateEvaluationPeriodDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-evaluation-period"
import { DeleteSelectedEvaluationPeriodsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-selected-evaluation-periods"
import { ExportEvaluationPeriodsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-evaluation-periods"
import { ExportSelectedEvaluationPeriodsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-selected-evaluation-periods"
import { NoticeOutlet } from "@/components/notice/notice-context"

interface TabEvaluationPeriodsProps {
  academicPeriodId?: number
}

export function TabEvaluationPeriods({ academicPeriodId }: TabEvaluationPeriodsProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const { data, isPending, isError, refetch } = useEvaluationPeriodsQuery({
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
    () => createEvaluationPeriodColumns({ academicPeriodId }),
    [academicPeriodId],
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
  })


  const selectedCodigos = useMemo(() => selectedIds.map(Number), [selectedIds])

  const namesById = useMemo(
    () => new Map((data?.rows ?? []).map((row) => [row.id, row.nombre])),
    [data],
  )

  return (
    <>
      <div className="mb-2 flex items-center justify-end gap-2 border-b border-border pb-2">
        {hasSelection ? (
          <>
            <DeleteSelectedEvaluationPeriodsDialog
              selectedIds={selectedIds}
              namesById={namesById}
              resetSelection={resetSelection}
            />
            <ExportSelectedEvaluationPeriodsDialog
              selectedIds={selectedCodigos}
              resetSelection={resetSelection}
            />
          </>
        ) : (
          <>
            <CreateEvaluationPeriodDialog academicPeriodId={academicPeriodId} />
            <ExportEvaluationPeriodsDialog filters={{}} academicPeriodId={academicPeriodId} />
          </>
        )}
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
