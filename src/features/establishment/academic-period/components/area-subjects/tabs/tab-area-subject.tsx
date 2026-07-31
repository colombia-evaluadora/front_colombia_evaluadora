"use no memo"

import { useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useDataTable } from "@/hooks/use-data-table"

import { columns } from "../table/columns-area-subject"
import { CreateAreaSubjectDialog } from "../dialogs/dialog-create-area-subject"
import { ExportAreaSubjectsDialog } from "../dialogs/dialog-export-area-subjects"
import { useAreaSubjectQuery } from "@/features/establishment/academic-period/api/query/area-subjects/use-area-subject"

interface TabAreaSubjectProps {
  academicPeriodId?: number
}

export function TabAreaSubject({ academicPeriodId }: TabAreaSubjectProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState("")

  const queryFilters = useMemo(
    () => ({ nombreInterno: search.trim() || undefined }),
    [search]
  )

  const { data, isPending, isError, refetch } = useAreaSubjectQuery({
    filters: queryFilters,
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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full gap-2 sm:w-72"
        >
          <FieldLabel htmlFor="area-subject-search">Buscar</FieldLabel>
          <Input
            id="area-subject-search"
            name="search"
            type="text"
            autoComplete="off"
            placeholder="Buscar por nombre"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPageIndex(0)
            }}
          />
        </Field>

        <div className="flex gap-2">
          <CreateAreaSubjectDialog academicPeriodId={academicPeriodId} />
          <ExportAreaSubjectsDialog filters={queryFilters} />
        </div>
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
