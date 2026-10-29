"use no memo"

import { useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { useDataTable } from "@/hooks/use-data-table"
import { useLocalPagination } from "@/features/establishment/academic-period/hooks/use-local-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import {
  useDeleteCalendarEntry,
  useSaveCalendarEntry,
} from "@/features/establishment/academic-period/api/mutations/save-calendar-entry"
import { useAcademicCalendarQuery } from "@/features/establishment/academic-period/api/query/use-academic-calendar"
import { useAcademicPeriodQuery } from "@/features/establishment/academic-period/api/query/use-academic-period"
import type { CalendarEntry } from "@/features/establishment/academic-period/api/types/academic-calendar"
import { CalendarEntryDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-calendar-entry"
import { createAcademicCalendarColumns } from "@/features/establishment/academic-period/components/table/columns-academic-calendar"
import { getCalendarSummary } from "@/features/establishment/academic-period/utils/academic-calendar"
import { usePeriodReadOnly } from "@/features/establishment/academic-period/utils/period-read-only"

interface TabAcademicCalendarProps {
  academicPeriodId?: number
}

// Pestaña Calendario académico (Sección 5.8, Regla 109): qué días del período
// son hábiles. Los festivos llegan solos; el establecimiento registra
// vacaciones, suspensiones y excepciones.
export function TabAcademicCalendar({ academicPeriodId }: TabAcademicCalendarProps) {
  const { notify } = useNotify()
  const [sorting, setSorting] = useState<SortingState>([])
  const [dialog, setDialog] = useState<{ open: boolean; entry: CalendarEntry | null }>({
    open: false,
    entry: null,
  })
  const [markingDate, setMarkingDate] = useState<string | null>(null)

  const { data: period, isPending: periodPending } = useAcademicPeriodQuery(academicPeriodId)
  const {
    data: entries = [],
    isPending,
    isError,
    error,
    refetch,
  } = useAcademicCalendarQuery(academicPeriodId)
  const saveMutation = useSaveCalendarEntry()
  const deleteMutation = useDeleteCalendarEntry()

  // Con el período Cerrado (o en "Ver"), la pestaña se abre en solo lectura.
  const { readOnly } = usePeriodReadOnly()
  const workedHolidays = new Set(entries.filter((e) => e.type === "HABIL").map((e) => e.from))

  function markWorking(holiday: CalendarEntry) {
    if (academicPeriodId == null) return
    setMarkingDate(holiday.from)
    saveMutation.mutate(
      {
        academicPeriodId,
        values: {
          type: "HABIL",
          from: holiday.from,
          to: holiday.to,
          reason: `${holiday.reason} trabajado`,
        },
      },
      {
        onSuccess: () => notify(SUCCESS_MESSAGES.academicCalendar.created),
        onError: (e) => notify(getErrorMessage(e), { variant: "error" }),
        onSettled: () => setMarkingDate(null),
      },
    )
  }

  async function deleteEntry(entry: CalendarEntry) {
    try {
      await deleteMutation.mutateAsync({ id: entry.id, academicPeriodId: academicPeriodId! })
      notify(SUCCESS_MESSAGES.academicCalendar.deleted)
      return true
    } catch (e) {
      notify(getErrorMessage(e), { variant: "error" })
      return false
    }
  }

  const columns = createAcademicCalendarColumns({
    readOnly,
    workedHolidays,
    markingDate,
    onMarkWorking: markWorking,
    onEdit: (entry) => setDialog({ open: true, entry }),
    onDelete: deleteEntry,
  })
  const page = useLocalPagination(entries)
  const { table } = useDataTable({
    columns,
    data: page.pageRows,
    getRowId: (row) => String(row.id),
    ...page.table,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "tab-academic-calendar-column-visibility",
  })

  if (periodPending) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  const summary = period ? getCalendarSummary(entries, period.startDate, period.endDate) : null
  const hasRegistered = entries.some((e) => e.origin === "REGISTRADO")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Calendario académico</h3>
        {!readOnly && (
          <Button color="primary" size="sm" onClick={() => setDialog({ open: true, entry: null })}>
            <PlusIcon data-icon="inline-start" />
            Agregar al calendario
          </Button>
        )}
      </div>

      <NoticeOutlet />


      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Aún no hay vacaciones, suspensiones ni excepciones. Los festivos se agregan solos."
        errorMessage={error ? getErrorMessage(error) : undefined}
      />

      <Pagination viewOptions={<DataTableViewOptions table={table} />} {...page.pagination} />

      {!isPending && !isError && entries.length > 0 && !hasRegistered && (
        <p className="text-sm text-muted-foreground">
          Aún no hay vacaciones, suspensiones ni excepciones. Los festivos se agregan solos.
        </p>
      )}

      {summary && (
        <p className="text-sm text-muted-foreground tabular-nums">
          Días hábiles: {summary.workingDays} · Semanas lectivas: {summary.teachingWeeks}
        </p>
      )}

      {period && academicPeriodId != null && (
        <CalendarEntryDialog
          key={dialog.entry?.id ?? "new"}
          open={dialog.open}
          onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
          academicPeriodId={academicPeriodId}
          periodStart={period.startDate}
          periodEnd={period.endDate}
          entry={dialog.entry}
        />
      )}
    </div>
  )
}
