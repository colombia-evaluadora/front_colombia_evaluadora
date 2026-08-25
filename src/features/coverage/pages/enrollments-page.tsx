"use no memo"

import { Badge } from "@/components/ui/badge"
import { CalendarIcon, ArrowRightIcon, SpinnerIcon } from "@/components/ui/icons"
import { useAcademicPeriodsQuery } from "@/features/establishment/academic-period/api/query/use-academic-periods"
import { RESERVATION_STATUS_BADGE } from "@/features/establishment/academic-period/api/ui-mappings"
import type { AcademicPeriod } from "@/features/establishment/academic-period/api/types/academic-period"
import { EnrollmentsSettingsSheet } from "@/features/coverage/components/sheets/sheet-enrollments-settings"
import { EnrollmentsTable } from "@/features/coverage/components/table/enrollments-table"

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function getDisplayedPeriod(rows: AcademicPeriod[]): AcademicPeriod | undefined {
  return (
    rows.find((period) => period.status === "I") ??
    rows.find((period) => period.reservationEnabled) ??
    rows[0]
  )
}

export function EnrollmentsPage() {
  const { data, isPending, isError } = useAcademicPeriodsQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 100,
  })
  const period = data ? getDisplayedPeriod(data.rows) : undefined
  const periodStatus = period
    ? RESERVATION_STATUS_BADGE[period.reservationEnabled ? "active" : "inactive"]
    : { variant: "soft" as const, color: "muted" as const }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 border-b border-border pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Inscripciones</h1>
          <EnrollmentsSettingsSheet period={period} isLoading={isPending} isError={isError} />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarIcon className="size-4 text-primary" />
            <span className="font-medium text-foreground">Periodo de inscripciones:</span>
            {isPending ? (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <SpinnerIcon className="size-4 animate-spin" />
                Cargando fechas…
              </span>
            ) : period ? (
              <>
                <span className="tabular-nums">{formatDate(period.startDate)}</span>
                <ArrowRightIcon className="size-4 text-muted-foreground" />
                <span className="tabular-nums">{formatDate(period.endDate)}</span>
              </>
            ) : (
              <span>Sin periodo configurado</span>
            )}
          </div>
          <Badge {...periodStatus}>
            Estado: {period ? (period.reservationEnabled ? "Activo" : "Inactivo") : "Sin datos"}
          </Badge>
        </div>
      </section>

      <EnrollmentsTable title="Inscripciones recibidas" />
    </div>
  )
}
