"use no memo"

import { useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"
import { MagnifyingGlassIcon } from "@/components/ui/icons"

import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { useDataTable } from "@/hooks/use-data-table"

import { columns } from "../table/columns-area-subject"
import { CreateAreaSubjectDialog } from "../dialogs/dialog-create-area-subject"
import { ExportAreaSubjectsDialog } from "../dialogs/dialog-export-area-subjects"
import { useAreaSubjectQuery } from "@/features/establishment/api/query/use-area-subject"

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
        <InputGroup className="w-full rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 sm:w-72">
          <InputGroupAddon align="inline-start" className="ml-2">
            <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Buscar por nombre"
            aria-label="Buscar área/asignatura por nombre"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPageIndex(0)
            }}
          />
        </InputGroup>

        <div className="flex gap-2">
          <ExportAreaSubjectsDialog filters={queryFilters} />
          <CreateAreaSubjectDialog academicPeriodId={academicPeriodId} />
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
