"use no memo"

import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import type { SortingState } from "@tanstack/react-table"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "@/components/ui/icons"
import { NoticeOutlet } from "@/components/notice/notice-context"
import { useDataTable } from "@/hooks/use-data-table"
import { useLocalPagination } from "@/features/establishment/academic-period/hooks/use-local-pagination"
import { getErrorMessage } from "@/lib/api-client"

import { useGradesQuery } from "@/features/establishment/academic-period/api/query/use-grades"
import { createGradeColumns } from "@/features/establishment/academic-period/components/table/columns-grades"
import { paths } from "@/config/paths"
import type { Jornada } from "@/features/establishment/academic-period/utils/schedule-data"

interface TabGradesProps {
  // Horario de la jornada del período; el grado lo usa salvo que lo personalice.
  jornada: Jornada
  academicPeriodId?: number
}

// Pestaña Grados (Sección 5.3): el listado. Agregar y modificar abren la
// página del grado (`periodos/$periodId/grados/...`).
export function TabGrades({ academicPeriodId }: TabGradesProps) {
  const navigate = useNavigate()
  const openGrade = (gradeId: number | null) => {
    if (academicPeriodId == null) return
    navigate({
      to:
        gradeId == null
          ? paths.app.periodosGradoAgregar.getHref(academicPeriodId)
          : paths.app.periodosGradoEditar.getHref(academicPeriodId, gradeId),
    })
  }
  const [sorting, setSorting] = useState<SortingState>([])

  const { data, isPending, isError, error, refetch } = useGradesQuery({
    filters: {},
    sorting,
    pageIndex: 0,
    pageSize: 200,
    academicPeriodId,
  })

  const columns = createGradeColumns({ onOpen: (grade) => openGrade(grade.id) })
  const page = useLocalPagination(data?.rows ?? [])
  const { table } = useDataTable({
    columns,
    data: page.pageRows,
    getRowId: (row) => String(row.id),
    ...page.table,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "tab-grades-column-visibility",
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Grados</h3>
        <Button color="primary" size="sm" onClick={() => openGrade(null)}>
          <PlusIcon data-icon="inline-start" />
          Agregar grado
        </Button>
      </div>

      <NoticeOutlet />

      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Aún no hay grados en este período. Use Agregar grado para crear el primero."
        errorMessage={error ? getErrorMessage(error) : undefined}
      />

      <Pagination viewOptions={<DataTableViewOptions table={table} />} {...page.pagination} />
    </div>
  )
}
