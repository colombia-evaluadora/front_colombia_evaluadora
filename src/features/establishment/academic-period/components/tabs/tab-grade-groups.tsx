"use no memo"

import { useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { NoticeOutlet } from "@/components/notice/notice-context"

import { useGradeGroupsQuery } from "@/features/establishment/academic-period/api/query/use-grade-groups"
import { createGradeGroupColumns } from "@/features/establishment/academic-period/components/table/columns-grade-groups"
import { CreateGradeGroupDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-grade-group"
import { DeleteSelectedGradeGroupsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-selected-grade-groups"
import { ExportSelectedGradeGroupsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-selected-grade-groups"
import { ExportGradeGroupsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-grade-groups"

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
    [academicPeriodId],
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

  const { table, selectedIds, hasSelection, resetSelection } = useDataTable({
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

  const idByCodigo = useMemo(
    () => new Map((data?.rows ?? []).map((row) => [row.codigo, row.id])),
    [data],
  )
  const namesById = useMemo(
    () => new Map((data?.rows ?? []).map((row) => [row.id, row.codigo])),
    [data],
  )
  const selectedGroupIds = useMemo(
    () =>
      selectedIds
        .map((codigo) => idByCodigo.get(codigo))
        .filter((id): id is number => id != null),
    [selectedIds, idByCodigo],
  )

  return (
    <>
      <div className="mb-2 flex items-center justify-end gap-2 border-b border-border pb-2">
        {hasSelection ? (
          <>
            <DeleteSelectedGradeGroupsDialog
              groupCount={selectedIds.length}
              groupIds={selectedGroupIds}
              namesById={namesById}
              resetSelection={resetSelection}
            />
            <ExportSelectedGradeGroupsDialog
              selectedIds={selectedGroupIds}
              resetSelection={resetSelection}
              academicPeriodId={academicPeriodId}
            />
          </>
        ) : (
          <>
            <CreateGradeGroupDialog gradeId={gradeId} academicPeriodId={academicPeriodId} />
            <ExportGradeGroupsDialog filters={{}} />
          </>
        )}
      </div>

      <NoticeOutlet className="mb-2" />

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
