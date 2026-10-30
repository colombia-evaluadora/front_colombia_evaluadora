"use no memo"

import { useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { WarningIcon } from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { useLocalPagination } from "@/features/establishment/academic-period/hooks/use-local-pagination"
import { NoticeOutlet } from "@/components/notice/notice-context"

import { useStudyPlansQuery } from "@/features/establishment/academic-period/api/query/use-study-plans"
import { useEvaluationCriteriaQuery } from "@/features/establishment/academic-period/api/query/use-evaluation-criteria"
import { useEvaluationCriteriaOptionsQuery } from "@/features/establishment/academic-period/api/query/catalogos-lista-valor"
import { getErrorMessage } from "@/lib/api-client"
import { useGradeSubjectLabel } from "@/features/establishment/academic-period/api/query/use-study-plan-subject-label"
import { createStudyPlanColumns } from "@/features/establishment/academic-period/components/table/columns-study-plan"
import { PrintReportButton } from "@/features/establishment/academic-period/components/print-report-button"
import { CreateStudyPlanDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-study-plan"
import { formatPeso } from "@/features/establishment/academic-period/components/table/columns-evaluation-periods"
import {
  usePeriodReadOnly,
  withoutRowActions,
} from "@/features/establishment/academic-period/utils/period-read-only"

interface TabStudyPlanProps {
  academicPeriodId?: number
  gradeId?: number
  gradeName?: string
  isPreescolar?: boolean
  isFormativo?: boolean
}

export function TabStudyPlan({
  academicPeriodId,
  gradeId,
  gradeName,
  isPreescolar,
  isFormativo,
}: TabStudyPlanProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const { data, isPending, isError, error, refetch } = useStudyPlansQuery({
    filters: {},
    sorting,
    pageIndex: 0,
    pageSize: 100,
    academicPeriodId,
    gradeId,
  })
  const { data: criteria } = useEvaluationCriteriaQuery(academicPeriodId)
  const { data: criteriaOptions } = useEvaluationCriteriaOptionsQuery()

  const subjectLabel = useGradeSubjectLabel(gradeId, Boolean(isPreescolar))
  // Regla 76: el Porcentaje solo cuenta con "Cada [Área] tiene un porcentaje".
  const areaCriteria = criteriaOptions?.areaGradeCriteria.find(
    (o) => o.key === criteria?.areaGradeCriteria,
  )?.label
  const byPercentage = areaCriteria?.toLowerCase().includes("porcentaje") ?? false
  const { readOnly } = usePeriodReadOnly()
  const columns = withoutRowActions(
    createStudyPlanColumns({
      academicPeriodId,
      gradeId,
      isPreescolar,
      isFormativo,
      subjectLabel,
      showPercentage: byPercentage,
    }),
    readOnly,
  )
  const page = useLocalPagination(data?.rows ?? [])
  const { table } = useDataTable({
    columns,
    data: page.pageRows,
    getRowId: (row) => String(row.codigo),
    ...page.table,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "tab-study-plan-column-visibility",
  })

  // Regla 76: con "Cada asignatura tiene un porcentaje", avisa (sin bloquear)
  // si las obligatorias de un área no suman 100 %.
  const sums = new Map<string, number>()
  for (const item of data?.rows ?? []) {
    if (!item.matriculaObligatoria || !item.areaNombre) continue
    sums.set(item.areaNombre, (sums.get(item.areaNombre) ?? 0) + item.influenciaArea)
  }
  const warnings = byPercentage ? [...sums].filter(([, total]) => Math.abs(total - 100) > 0.05) : []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-lg font-semibold">
          Plan de estudio{gradeName ? ` de ${gradeName}` : ""}
        </h4>
        <div className="flex items-center gap-2">
          {academicPeriodId != null && gradeId != null && (
            <PrintReportButton
              label="Imprimir plan de estudio"
              report="periodo-planes-estudio"
              filters={{ FK_PERIODO: academicPeriodId, FK_GRADOS: [gradeId] }}
              emptyReason={
                (data?.rows.length ?? 0) === 0 ? "El grado aún no tiene plan de estudio." : undefined
              }
            />
          )}
          {!readOnly && (
            <CreateStudyPlanDialog
              academicPeriodId={academicPeriodId}
              gradeId={gradeId}
              isPreescolar={isPreescolar}
              isFormativo={isFormativo}
              subjectLabel={subjectLabel}
            />
          )}
        </div>
      </div>

      <NoticeOutlet />

      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="El grado aún no tiene plan de estudio. Use Agregar asignatura para armarlo."
        errorMessage={error ? getErrorMessage(error) : undefined}
      />

      <Pagination viewOptions={<DataTableViewOptions table={table} />} {...page.pagination} />

      {warnings.length > 0 && (
        <ul className="flex flex-col gap-1">
          {warnings.map(([area, total]) => (
            <li key={area} className="flex items-start gap-2 text-sm text-orange">
              <WarningIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              Los porcentajes de las asignaturas obligatorias de {area} suman {formatPeso(total)}.
              Se usan como pesos relativos entre las asignaturas que cursa cada estudiante.
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
