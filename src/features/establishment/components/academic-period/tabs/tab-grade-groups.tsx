"use no memo"

import { useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { useGradeGroupsQuery } from "../../../api/query/use-grade-groups-query"
import { createGradeGroupColumns } from "../table/columns-grade-groups"
import { CreateGradeGroupDialog } from "../dialogs/dialog-create-grade-group"

interface TabGradeGroupsProps {
  gradeId?: number
  academicPeriodId?: number
}

export function TabGradeGroups({ gradeId, academicPeriodId }: TabGradeGroupsProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const columns = useMemo(
    () => createGradeGroupColumns({ academicPeriodId }),
    [academicPeriodId]
  )

  const { data, isPending, isError, refetch } = useGradeGroupsQuery({
    filters: {},
    sorting,
    pageIndex,
    pageSize,
    gradeId,
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
    getRowId: (row) => row.codigo,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize: changePageSize,
    sorting,
    setSorting,
  })

  return (
    <>
      <div className="mb-2 flex justify-end">
        <CreateGradeGroupDialog
          gradeId={gradeId}
          academicPeriodId={academicPeriodId}
        />
      </div>

      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Aún no hay grupos."
        errorMessage="Ocurrió un error al cargar los grupos."
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
