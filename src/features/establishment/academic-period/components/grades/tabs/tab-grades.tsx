"use no memo"

import { useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { useGradesQuery } from "../../../api/query/grades/use-grades-query"
import { createGradeColumns } from "../table/columns-grades"
import { CreateGradeDialog } from "../dialogs/dialog-create-grade"
import { ExportGradesDialog } from "../dialogs/dialog-export-grades"
import { NoticeOutlet } from "../../common/notice-context"
import type { Jornada } from "../../schedule/schedule-data"

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
    [jornada, academicPeriodId]
  )

  const { table } = useDataTable({
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

  return (
    <>
      <div className="mb-2 flex items-center justify-end gap-2">
        <CreateGradeDialog jornada={jornada} academicPeriodId={academicPeriodId} />
        <ExportGradesDialog filters={{}} />
        <DataTableViewOptions table={table} />
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
