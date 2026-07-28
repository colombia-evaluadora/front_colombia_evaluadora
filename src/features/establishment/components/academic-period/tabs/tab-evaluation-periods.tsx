"use no memo"

import { useState } from "react"
import type { SortingState } from "@tanstack/react-table"
import { FilePdfIcon, FileXlsIcon } from "@/components/ui/icons"

import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { useDataTable } from "@/hooks/use-data-table"

import { useEvaluationPeriodsQuery } from "../../../api/query/use-evaluation-periods-query"
import { columns } from "../table/columns-evaluation-periods"
import { CreateEvaluationPeriodDialog } from "../dialogs/dialog-create-evaluation-period"

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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Exportar a PDF"
            disabled
          >
            <FilePdfIcon className="text-destructive" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Exportar a Excel"
            disabled
          >
            <FileXlsIcon className="text-success" />
          </Button>
        </div>
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
