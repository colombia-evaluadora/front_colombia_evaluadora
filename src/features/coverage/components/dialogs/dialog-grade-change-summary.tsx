import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon } from "@/components/ui/icons"
import { formatGrade } from "@/features/coverage/api/ui-mappings"
import type { GradeChangeGradesAction } from "@/features/coverage/components/dialogs/dialog-grade-change"

const GRADES_ACTION_LABELS: Record<GradeChangeGradesAction, string> = {
  eliminar: "Eliminadas",
  trasladar: "Trasladadas",
}

function formatMovementDate(date: Date): string {
  const formatted = date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  // "es-CO" da "a. m."/"p. m." con espacios/puntos — se normaliza a "a.m."/"p.m.".
  return formatted.replace(/\s*([ap])\.?\s*m\.?/i, (_, letter: string) => `${letter.toLowerCase()}.m.`)
}

/** "grado" = disparado desde `GradeChangeDialog`; "sede" = desde
 * `CambioSedeMatriculaDialog`. Comparten este mismo diálogo de resultado —
 * solo cambia qué línea del resumen se resalta con la flecha. */
export type MatriculaMovementKind = "grado" | "sede"

export interface GradeChangeSummary {
  studentName: string
  movementKind: MatriculaMovementKind
  /** "Promoción anticipada" / "Corrección de matrícula" / "Reubicación de
   * sede" — ya resuelto por quien arma el resumen (ver
   * `matricula-edit-page.tsx`), porque cada flujo tiene su propio criterio
   * para elegirlo. */
  movementLabel: string
  fromCampus: string
  toCampus: string
  fromGrade: number
  toGrade: number
  group: string
  /** `null` cuando el movimiento es de Sede y no tocó calificaciones (ver
   * `dialog-cambio-sede-matricula.tsx`: ya no pregunta por ellas). */
  gradesAction: GradeChangeGradesAction | null
  date: Date
  userName: string
}

interface GradeChangeSummaryDialogProps {
  open: boolean
  summary: GradeChangeSummary | null
  onClose: () => void
}

export function GradeChangeSummaryDialog({ open, summary, onClose }: GradeChangeSummaryDialogProps) {
  if (!summary) return null

  const isSuperior = summary.toGrade > summary.fromGrade
  const tipoMovimiento =
    summary.movementKind === "sede"
      ? "Cambio de sede"
      : isSuperior
        ? "Cambio a grado superior"
        : "Cambio a grado inferior"

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircleIcon className="size-5 text-green" />
            ¡Matrícula actualizada!
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Los cambios se han aplicado y quedan registrados en el historial académico.
          </p>
        </DialogHeader>

        <div className="rounded-md border border-input bg-muted/30 p-4">
          <p className="mb-1 text-sm font-semibold text-foreground">
            Resumen del movimiento - {summary.movementLabel}
          </p>
          <ul className="flex list-disc flex-col gap-0 pl-5 text-sm text-foreground leading-tight">
            <li>
              <span className="font-medium">Estudiante:</span> {summary.studentName}
            </li>
            <li>
              <span className="font-medium">Tipo de movimiento:</span> {tipoMovimiento}
            </li>
            <li>
              <span className="font-medium">Sede:</span>{" "}
              {summary.fromCampus === summary.toCampus ? (
                summary.toCampus
              ) : (
                <>
                  {summary.fromCampus} → <strong>{summary.toCampus}</strong>
                </>
              )}
            </li>
            <li>
              <span className="font-medium">Grado:</span>{" "}
              {summary.fromGrade === summary.toGrade ? (
                formatGrade(summary.toGrade)
              ) : (
                <>
                  {formatGrade(summary.fromGrade)} → <strong>{formatGrade(summary.toGrade)}</strong>
                </>
              )}
            </li>
            <li>
              <span className="font-medium">Grupo:</span> {summary.group}
            </li>
            {summary.gradesAction && (
              <li>
                <span className="font-medium">Calificaciones:</span>{" "}
                {GRADES_ACTION_LABELS[summary.gradesAction]}
              </li>
            )}
            <li>
              <span className="font-medium">Fecha:</span> {formatMovementDate(summary.date)}
            </li>
            <li>
              <span className="font-medium">Usuario:</span> {summary.userName}
            </li>
          </ul>
        </div>

        <DialogFooter className="sm:justify-end">
          <DialogClose render={<Button size="sm" type="button" color="primary" />}>Entendido</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
