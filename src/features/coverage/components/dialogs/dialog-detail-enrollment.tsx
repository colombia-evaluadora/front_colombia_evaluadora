import { EyeIcon } from "@/components/ui/icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { formatGrade } from "@/features/coverage/api/ui-mappings"
import {
  ENROLLMENT_STATUS_BADGE,
  ENROLLMENT_STATUS_LABELS,
} from "@/features/coverage/api/ui-mappings-enrollments"
import type { Enrollment } from "@/features/coverage/api/types/enrollment"

function formatEnrollmentDate(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(isoDate))
  } catch {
    return isoDate
  }
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value ?? "—"}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <span className="text-sm font-semibold text-foreground">{title}</span>
      {children}
    </div>
  )
}

/** Mismo patrón que `DetailPreMatriculaDialog`: modal "eye" de solo lectura. */
export function DetailEnrollmentDialog({ enrollment }: { enrollment: Enrollment }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label={`Ver detalle de ${enrollment.firstName} ${enrollment.lastName}`}
          />
        }
      >
        <EyeIcon />
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-slim"
      >
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>Inscripción</DialogTitle>
          <Badge {...ENROLLMENT_STATUS_BADGE[enrollment.status]}>
            {ENROLLMENT_STATUS_LABELS[enrollment.status]}
          </Badge>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Section title="Datos del estudiante">
            <div className="grid grid-cols-4 gap-x-4 gap-y-4">
              <DetailField label="Número de documento" value={enrollment.documentNumber} />
              <DetailField label="Nombres" value={enrollment.firstName} />
              <DetailField label="Apellidos" value={enrollment.lastName} />
              <DetailField label="Sede" value={enrollment.campus} />
              <DetailField label="Grado" value={formatGrade(enrollment.grade)} />
              <DetailField label="Grupo" value={enrollment.group} />
              <DetailField label="Jornada" value={enrollment.shift} />
              <DetailField
                label="Fecha de inscripción"
                value={formatEnrollmentDate(enrollment.enrollmentDate)}
              />
            </div>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
