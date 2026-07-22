"use no memo"


import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

import { useAcademicPeriodsQuery } from "../../api/query/use-academic-periods-query"
import { ACADEMIC_PERIOD_STATUS_LABELS } from "../../api/ui-mappings"
import type { AcademicPeriodStatus } from "../../api/types/academic-period/academic-period"
import { useAcademicPeriodFilters } from "../../hooks/academic-period/use-academic-period-filters"
import { columns } from "./columns-academic-periods"
import { ExportAcademicPeriodsDialog } from "../dialogs/dialog-export-academic-periods"

const ALL = "Todos"

const BOX =
  "h-11 w-56 rounded-lg border border-input bg-transparent px-3 text-sm transition-colors hover:border-ring/50 focus-visible:border-ring aria-invalid:border-destructive data-[size=default]:h-11"

const YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() - 2020 + 1 },
  (_, i) => new Date().getFullYear() - i
)

const STATUS_OPTIONS: AcademicPeriodStatus[] = ["ACTIVO", "INACTIVO"]

export function AcademicPeriodsDataTable() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } =
    useTablePagination()

  const {
    sedeName,
    schoolYearId,
    status,
    queryFilters,
    setSedeName,
    setSchoolYearId,
    setStatus,
  } = useAcademicPeriodFilters()

  const { data, isPending, isError, refetch } = useAcademicPeriodsQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
  })

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col gap-1">

          <label className="text-sm font-medium">Buscar</label>
          <Input
            type="text"
            autoComplete="off"
            placeholder="Buscar por sede…"
            value={sedeName}
            onChange={(event) => setSedeName(event.target.value)}
            className={BOX}
          />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Año lectivo</label>

            <Select
              value={schoolYearId ? String(schoolYearId) : ALL}
              onValueChange={(value) =>
                setSchoolYearId(value !== ALL ? Number(value) : undefined)
              }
            >
              <SelectTrigger className={BOX}>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>

                {YEAR_OPTIONS.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Estado</label>

            <Select
              value={status ?? ALL}
              onValueChange={(value) =>
                setStatus(value !== ALL ? (value as AcademicPeriodStatus) : undefined)
              }
            >
              <SelectTrigger className={BOX}>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>

                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {ACADEMIC_PERIOD_STATUS_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ExportAcademicPeriodsDialog filters={queryFilters} />
      </div>

      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Sin resultados."
        errorMessage="Ocurrió un error al cargar los periodos académicos."
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
          onPageSizeChange={setPageSize}
        />
      )}
    </>
  )
}
