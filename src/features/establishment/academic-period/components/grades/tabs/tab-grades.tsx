"use no memo"

import { useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { useGradesQuery } from "../../../api/query/grades/use-grades-query"
import { createGradeColumns } from "../table/columns-grades"
import { CreateGradeDialog } from "../dialogs/dialog-create-grade"
import { DeleteSelectedGradesDialog } from "../dialogs/dialog-delete-selected-grades"
import { ExportGradesDialog } from "../dialogs/dialog-export-grades"
import { ExportSelectedGradesDialog } from "../dialogs/dialog-export-selected-grades"
import { NoticeOutlet } from "@/components/notice/notice-context"
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
  })

  const selectedGradeIds = useMemo(() => selectedIds.map(Number), [selectedIds])

  return (
    <>
      {/* El `border-b` cierra la barra de acciones igual que el `hr` de
          `TableScreenHeader` en las pantallas de listado. */}
      <div className="mb-2 flex items-center justify-end gap-2 border-b border-border pb-2">
        {hasSelection ? (
          <>
            <DeleteSelectedGradesDialog selectedIds={selectedIds} resetSelection={resetSelection} />
            <ExportSelectedGradesDialog
              selectedIds={selectedGradeIds}
              resetSelection={resetSelection}
            />
          </>
        ) : (
          <>
            <CreateGradeDialog jornada={jornada} academicPeriodId={academicPeriodId} />
            <ExportGradesDialog filters={{}} />
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
