"use no memo"

import { useState } from "react"
import type { SortingState } from "@tanstack/react-table"
import { FilePdfIcon, FileXlsIcon } from "@phosphor-icons/react"

import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { useDataTable } from "@/hooks/use-data-table"

import { useGradesQuery } from "../../../api/query/use-grades-query"
import { columns } from "../table/columns-grades"
import { CreateGradeDialog } from "../dialogs/dialog-create-grade"
import type { Jornada } from "../schedule/schedule-data"

interface TabGradesProps {
  jornada: Jornada
}

export function TabGrades({ jornada }: TabGradesProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const { data, isPending, isError, refetch } = useGradesQuery({
    filters: {},
    sorting,
    pageIndex,
    pageSize,
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
        <CreateGradeDialog jornada={jornada} />
      </div>

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
