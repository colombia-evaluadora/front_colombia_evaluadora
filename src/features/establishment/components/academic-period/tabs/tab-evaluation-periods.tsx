"use no memo"

import { useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { useEvaluationPeriodsQuery } from "../../../api/query/use-evaluation-periods-query"
import { columns } from "../table/columns-evaluation-periods"
import { CreateEvaluationPeriodDialog } from "../dialogs/dialog-create-evaluation-period"
import { ExportEvaluationPeriodsDialog } from "../dialogs/dialog-export-evaluation-periods"

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

  const { table } = useDataTable({
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
      <div className="mb-2 flex items-center justify-between gap-2">
        <ExportEvaluationPeriodsDialog filters={{}} />
        <CreateEvaluationPeriodDialog academicPeriodId={academicPeriodId} />
      </div>

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
