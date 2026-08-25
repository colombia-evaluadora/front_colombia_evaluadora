"use no memo"

import { CalendarIcon, ArrowRightIcon } from "@/components/ui/icons"
import { EnrollmentsTable } from "@/features/coverage/components/table/enrollments-table"

export function EnrollmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 border-b border-border pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Inscripciones</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarIcon className="size-4 text-primary" />
            <span className="font-medium text-foreground">Periodo de inscripciones:</span>
            <span className="tabular-nums">26/03/2024</span>
            <ArrowRightIcon className="size-4 text-muted-foreground" />
            <span className="tabular-nums">26/05/2024</span>
          </div>
          <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
            Estado: en curso
          </span>
        </div>
      </section>

      <EnrollmentsTable title="Inscripciones recibidas" />
    </div>
  )
}
