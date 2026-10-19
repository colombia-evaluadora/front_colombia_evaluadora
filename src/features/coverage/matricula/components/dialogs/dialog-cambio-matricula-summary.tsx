import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircleIcon } from "@/components/ui/icons"
import { useMatriculaGradeLabel } from "@/features/coverage/matricula/hooks/use-matricula-grade-label"
import type { GradeChangeGradesAction } from "@/features/coverage/matricula/components/dialogs/dialog-cambio-grado-matricula"
import type { BulkMatriculaChangeStudentResult } from "@/features/coverage/matricula/api/types/matricula"

/** Resumen masivo: una fila por estudiante (grados ya formateados por el backend). */
export interface CambioMatriculaSummary {
  students: BulkMatriculaChangeStudentResult[]
}

export type MatriculaMovementKind = "grado" | "sede" | "grupo"

/** Resumen individual: detalle del movimiento de una matrícula. */
export interface GradeChangeSummary {
  studentName: string
  movementKind: MatriculaMovementKind
  movementLabel: string
  fromCampus: string
  toCampus: string
  fromGrade: number
  toGrade: number
  fromGroup: string
  toGroup: string
  gradesAction: GradeChangeGradesAction | null
  date: Date
  userName: string
}

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
  return formatted.replace(/\s*([ap])\.?\s*m\.?/i, (_, letter: string) => `${letter.toLowerCase()}.m.`)
}

type CambioMatriculaSummaryDialogProps = {
  open: boolean
  onClose: () => void
} & (
  | { modo: "masivo"; summary: CambioMatriculaSummary | null }
  | { modo: "individual"; summary: GradeChangeSummary | null }
)

export function CambioMatriculaSummaryDialog(props: CambioMatriculaSummaryDialogProps) {
  const { open, onClose } = props
  const gradeLabel = useMatriculaGradeLabel()
  if (!props.summary) return null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircleIcon className="size-5 text-green" />
            ¡Matrícula actualizada!
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {props.modo === "masivo"
              ? `Cambios aplicados a ${props.summary.students.length} estudiante${props.summary.students.length === 1 ? "" : "s"}.`
              : "Los cambios se han aplicado y quedan registrados en el historial académico."}
          </p>
        </DialogHeader>

        {props.modo === "masivo" ? (
          <ResumenMasivo summary={props.summary} />
        ) : (
          <ResumenIndividual summary={props.summary} gradeLabel={gradeLabel} />
        )}

        <DialogFooter className="sm:justify-end">
          <DialogClose render={<Button size="sm" type="button" color="primary" />}>Entendido</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function fromTo(from: string, to: string) {
  return from === to ? to : `${from} → ${to}`
}

function ResumenMasivo({ summary }: { summary: CambioMatriculaSummary }) {
  return (
    <div className="max-h-72 overflow-y-auto rounded-md border border-input">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Estudiante</TableHead>
            <TableHead>Sede</TableHead>
            <TableHead>Grado</TableHead>
            <TableHead>Grupo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.students.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="font-medium text-foreground">{student.name}</TableCell>
              <TableCell>{fromTo(student.fromCampus, student.toCampus)}</TableCell>
              <TableCell>{fromTo(student.fromGrade, student.toGrade)}</TableCell>
              <TableCell>{fromTo(student.fromGroup, student.toGroup)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function FromToStrong({ from, to }: { from: string; to: string }) {
  if (from === to) return <>{to}</>
  return (
    <>
      {from} → <strong>{to}</strong>
    </>
  )
}

function ResumenIndividual({
  summary,
  gradeLabel,
}: {
  summary: GradeChangeSummary
  gradeLabel: (grade: number) => string
}) {
  return (
    <div className="rounded-md border border-input bg-muted/30 p-4">
      <p className="mb-1 text-sm font-semibold text-foreground">
        Resumen del movimiento - {summary.movementLabel}
      </p>
      <ul className="flex list-disc flex-col gap-0 pl-5 text-sm text-foreground leading-tight">
        <li>
          <span className="font-medium">Estudiante:</span> {summary.studentName}
        </li>
        <li>
          <span className="font-medium">Tipo de movimiento:</span> {summary.movementLabel}
        </li>
        <li>
          <span className="font-medium">Sede:</span>{" "}
          <FromToStrong from={summary.fromCampus} to={summary.toCampus} />
        </li>
        <li>
          <span className="font-medium">Grado:</span>{" "}
          {summary.fromGrade === summary.toGrade ? (
            gradeLabel(summary.toGrade)
          ) : (
            <FromToStrong from={gradeLabel(summary.fromGrade)} to={gradeLabel(summary.toGrade)} />
          )}
        </li>
        <li>
          <span className="font-medium">Grupo:</span>{" "}
          <FromToStrong from={summary.fromGroup} to={summary.toGroup} />
        </li>
        {summary.gradesAction && (
          <li>
            <span className="font-medium">Calificaciones:</span> {GRADES_ACTION_LABELS[summary.gradesAction]}
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
  )
}
