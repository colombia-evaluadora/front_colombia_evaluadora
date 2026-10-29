"use no memo"

import { useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useLocalPagination } from "@/features/establishment/academic-period/hooks/use-local-pagination"
import { NoticeOutlet } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useGradeGroupsQuery } from "@/features/establishment/academic-period/api/query/use-grade-groups"
import { useAcademicPeriodQuery } from "@/features/establishment/academic-period/api/query/use-academic-period"
import type { Grade } from "@/features/establishment/academic-period/api/types/grade"
import { createGradeGroupColumns } from "@/features/establishment/academic-period/components/table/columns-grade-groups"
import { CreateGradeGroupDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-grade-group"
import {
  GroupSchedule,
  type GroupScheduleSource,
} from "@/features/establishment/academic-period/components/fields/group-schedule"
import { usePeriodReadOnly, withoutRowActions } from "@/features/establishment/academic-period/utils/period-read-only"

interface TabGradeGroupsProps {
  gradeId?: number
  academicPeriodId?: number
  grade?: Grade
}

export function TabGradeGroups({ gradeId, academicPeriodId, grade }: TabGradeGroupsProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [scheduleGroupId, setScheduleGroupId] = useState<number | null>(null)

  const { data, isPending, isError, error, refetch } = useGradeGroupsQuery({
    filters: {},
    sorting,
    pageIndex: 0,
    pageSize: 100,
    gradeId,
  })
  const { data: period } = useAcademicPeriodQuery(academicPeriodId)

  const { readOnly } = usePeriodReadOnly()
  const columns = withoutRowActions(
    createGradeGroupColumns({
      academicPeriodId,
      gradeName: grade?.nombre,
      onOpenSchedule: (group) => setScheduleGroupId(group.id),
    }),
    readOnly,
  )
  const page = useLocalPagination(data?.rows ?? [])
  const { table } = useDataTable({
    columns,
    data: page.pageRows,
    getRowId: (row) => String(row.id),
    ...page.table,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "tab-grade-groups-column-visibility",
  })

  const scheduleGroup = data?.rows.find((g) => g.id === scheduleGroupId)
  // El horario del grado si lo personaliza; si no, el de la jornada (Regla 87).
  const schedule: GroupScheduleSource = grade?.personalizarHorario
    ? {
        startTime: grade.horaInicio ?? "",
        endTime: grade.horaFin ?? "",
        blocks: grade.bloques ?? null,
        breaks: grade.recesos ?? [],
      }
    : {
        startTime: period?.config.scheduleStartTime ?? "",
        endTime: period?.config.scheduleEndTime ?? "",
        blocks: period?.config.defaultBlocksCount ?? null,
        breaks: period?.config.breaks ?? [],
      }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-lg font-semibold">Grupos</h4>
        {!readOnly && <CreateGradeGroupDialog gradeId={gradeId} academicPeriodId={academicPeriodId} />}
      </div>

      <NoticeOutlet />

      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        isRowHighlighted={(row) => row.original.id === scheduleGroupId}
        emptyMessage="El grado aún no tiene grupos. Use Agregar grupo para crear el primero."
        errorMessage={error ? getErrorMessage(error) : undefined}
      />

      <Pagination viewOptions={<DataTableViewOptions table={table} />} {...page.pagination} />

      {scheduleGroup && gradeId != null && (
        <GroupSchedule key={scheduleGroup.id} gradeId={gradeId} group={scheduleGroup} schedule={schedule} />
      )}
    </div>
  )
}
