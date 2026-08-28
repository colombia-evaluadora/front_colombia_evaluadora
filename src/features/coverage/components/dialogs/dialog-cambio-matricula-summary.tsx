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
import { formatGrade } from "@/features/coverage/api/ui-mappings"
import type { BulkMatriculaChangeStudentResult } from "@/features/coverage/api/types/matricula"

export interface CambioMatriculaSummary {
  students: BulkMatriculaChangeStudentResult[]
}

interface CambioMatriculaSummaryDialogProps {
  open: boolean
  summary: CambioMatriculaSummary | null
  onClose: () => void
}

export function CambioMatriculaSummaryDialog({
  open,
  summary,
  onClose,
}: CambioMatriculaSummaryDialogProps) {
  if (!summary) return null

  const { students } = summary

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircleIcon className="size-5 text-green" />
            ¡Matrícula actualizada!
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cambios aplicados a {students.length} estudiante{students.length === 1 ? "" : "s"}.
          </p>
        </DialogHeader>

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
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium text-foreground">{student.name}</TableCell>
                  <TableCell>
                    {student.fromCampus === student.toCampus
                      ? student.toCampus
                      : `${student.fromCampus} → ${student.toCampus}`}
                  </TableCell>
                  <TableCell>
                    {student.fromGrade === student.toGrade
                      ? formatGrade(student.toGrade)
                      : `${formatGrade(student.fromGrade)} → ${formatGrade(student.toGrade)}`}
                  </TableCell>
                  <TableCell>
                    {student.fromGroup === student.toGroup
                      ? student.toGroup
                      : `${student.fromGroup} → ${student.toGroup}`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="sm:justify-end">
          <DialogClose render={<Button size="sm" type="button" color="primary" />}>Entendido</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
