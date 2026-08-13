"use no memo"

import { useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { useStudyPlansQuery } from "@/features/establishment/academic-period/api/query/use-study-plans"
import { createStudyPlanColumns } from "@/features/establishment/academic-period/components/table/columns-study-plan"
import { CreateStudyPlanDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-study-plan"

interface TabStudyPlanProps {
  academicPeriodId?: number
  gradeId?: number
}

export function TabStudyPlan({ academicPeriodId, gradeId }: TabStudyPlanProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const { data, isPending, isError, refetch } = useStudyPlansQuery({
    filters: {},
    sorting,
    pageIndex,
    pageSize,
    academicPeriodId,
    gradeId,
  })

  const goToPage = setPageIndex
  const changePageSize = (size: number) => {
    setPageSize(size)
    setPageIndex(0)
  }

  const columns = useMemo(
    () => createStudyPlanColumns({ academicPeriodId, gradeId }),
    [academicPeriodId, gradeId],
  )

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
      {/* El `border-b` cierra la barra de acciones igual que el `hr` de
          `TableScreenHeader` en las pantallas de listado. */}
      <div className="mb-2 flex justify-end gap-2 border-b border-border pb-2">
        <CreateStudyPlanDialog academicPeriodId={academicPeriodId} gradeId={gradeId} />
      </div>

      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Aún no hay asignaturas en el plan de estudio."
        errorMessage="Ocurrió un error al cargar el plan de estudio."
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
