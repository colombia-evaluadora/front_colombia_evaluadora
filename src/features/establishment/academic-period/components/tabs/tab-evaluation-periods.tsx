"use no memo"

import { useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useLocalPagination } from "@/features/establishment/academic-period/hooks/use-local-pagination"

import { useEvaluationPeriodsQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-periods"
import { getErrorMessage } from "@/lib/api-client"
import {
  createEvaluationPeriodColumns,
  formatPeso,
} from "@/features/establishment/academic-period/components/table/columns-evaluation-periods"
import { CreateEvaluationPeriodDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-evaluation-period"
import { DeleteSelectedEvaluationPeriodsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-selected-evaluation-periods"
import { ExportEvaluationPeriodsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-evaluation-periods"
import { ExportSelectedEvaluationPeriodsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-selected-evaluation-periods"
import { NoticeOutlet } from "@/components/notice/notice-context"
import { WarningIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

// Un año tiene pocos cortes: con este tamaño cabe todo en una página y la suma
// de pesos sale de las filas cargadas.
const ALL_ROWS = 200

/** Suma de los pesos de todos los cortes: debe dar 100 % para la nota final. */
function WeightTotal({ total }: { total: number }) {
  const complete = Math.abs(total - 100) < 0.005
  const over = total > 100
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex shrink-0 items-center gap-2">
        <div
          role="progressbar"
          aria-label="Suma de los pesos"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(total, 100)}
          className="h-1.5 w-48 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn("h-full rounded-full", complete ? "bg-green" : "bg-orange")}
            style={{ width: `${Math.min(total, 100)}%` }}
          />
        </div>
        <span className="text-sm tabular-nums">{formatPeso(total)}</span>
      </div>
      {!complete && (
        <p
          role="status"
          className="flex flex-1 items-start gap-2 rounded-md border border-orange-stroke bg-orange-22 px-3 py-2 text-sm"
        >
          <WarningIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-orange" />
          {over
            ? `La suma de los pesos es ${formatPeso(total)}. No puede pasar de 100 %: baje el peso de algún período.`
            : `La suma de los pesos es ${formatPeso(total)}. Debe ser 100 % para calcular la nota final.`}
        </p>
      )}
    </div>
  )
}

interface TabEvaluationPeriodsProps {
  academicPeriodId?: number
}

export function TabEvaluationPeriods({ academicPeriodId }: TabEvaluationPeriodsProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const { data, isPending, isError, error, refetch } = useEvaluationPeriodsQuery({
    filters: {},
    sorting,
    // Trae todos los cortes: el total de pesos los necesita; la tabla pagina en el front.
    pageIndex: 0,
    pageSize: ALL_ROWS,
    academicPeriodId,
  })
  const page = useLocalPagination(data?.rows ?? [])

  const columns = useMemo(
    () => createEvaluationPeriodColumns({ academicPeriodId }),
    [academicPeriodId],
  )

  const { table, selectedIds, hasSelection, resetSelection } = useDataTable({
    columns,
    data: page.pageRows,
    getRowId: (row) => String(row.id),
    ...page.table,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "tab-evaluation-periods-column-visibility",
  })


  const selectedCodigos = useMemo(() => selectedIds.map(Number), [selectedIds])

  const namesById = useMemo(
    () => new Map((data?.rows ?? []).map((row) => [row.id, row.nombre])),
    [data],
  )

  const rows = data?.rows ?? []
  // Solo es confiable si todos los cortes caben en la página actual.
  const allLoaded = data != null && data.totalCount <= rows.length
  const weightTotal = rows.reduce((sum, row) => sum + (Number(row.peso) || 0), 0)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-medium">Períodos de evaluación</h2>
        <div className="flex items-center gap-2">
        {hasSelection ? (
          <>
            <DeleteSelectedEvaluationPeriodsDialog
              selectedIds={selectedIds}
              namesById={namesById}
              resetSelection={resetSelection}
            />
            <ExportSelectedEvaluationPeriodsDialog
              selectedIds={selectedCodigos}
              resetSelection={resetSelection}
              academicPeriodId={academicPeriodId}
            />
          </>
        ) : (
          <>
            <CreateEvaluationPeriodDialog academicPeriodId={academicPeriodId} />
            <ExportEvaluationPeriodsDialog filters={{}} academicPeriodId={academicPeriodId} />
          </>
        )}
        </div>
      </div>

      <NoticeOutlet className="mb-2" />

      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Aún no hay períodos de evaluación. Agregue el primero para dividir el año en cortes."
        errorMessage={error ? getErrorMessage(error) : undefined}
      />
      {allLoaded && rows.length > 0 && <WeightTotal total={weightTotal} />}
      <Pagination viewOptions={<DataTableViewOptions table={table} />} {...page.pagination} />
    </>
  )
}
