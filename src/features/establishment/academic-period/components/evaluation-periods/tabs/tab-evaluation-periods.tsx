"use no memo"

import { useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { useEvaluationPeriodsQuery } from "../../../api/query/evaluation-periods/use-evaluation-periods-query"
import { createEvaluationPeriodColumns } from "../table/columns-evaluation-periods"
import { CreateEvaluationPeriodDialog } from "../dialogs/dialog-create-evaluation-period"
import { DeleteSelectedEvaluationPeriodsDialog } from "../dialogs/dialog-delete-selected-evaluation-periods"
import { ExportEvaluationPeriodsDialog } from "../dialogs/dialog-export-evaluation-periods"
import { ExportSelectedEvaluationPeriodsDialog } from "../dialogs/dialog-export-selected-evaluation-periods"
import { NoticeOutlet } from "../../common/notice-context"

interface TabEvaluationPeriodsProps {
  academicPeriodId?: number
}

export function TabEvaluationPeriods({
  academicPeriodId,
}: TabEvaluationPeriodsProps) {
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
    [academicPeriodId]
  )

  const {
    table,
    selectedIds,
    hasSelection,
    resetSelection,
  } = useDataTable({
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

  // `selectedIds` viene como string[] (los ids de la tabla); los codigos de
  // evaluation period son `number`, así que convertimos antes de mandar al back.
  const selectedCodigos = useMemo(
    () => selectedIds.map(Number),
    [selectedIds]
  )

  return (
    <>
      <div className="mb-2 flex items-center justify-end gap-2">
        {hasSelection ? (
          <>
            <DeleteSelectedEvaluationPeriodsDialog
              selectedIds={selectedIds}
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
            <ExportEvaluationPeriodsDialog filters={{}} />
          </>
        )}
        <DataTableViewOptions table={table} />
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
