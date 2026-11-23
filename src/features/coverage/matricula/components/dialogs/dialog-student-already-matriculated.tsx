import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { useMatriculaGradeLabel } from "@/features/coverage/matricula/hooks/use-matricula-grade-label"
import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"

interface StudentAlreadyMatriculatedDialogProps {
  matricula: Matricula
  /** Nombre del estudiante como se digitó en el alta. */
  nombre: string
  /** Período de la matrícula existente (mismo que el elegido). */
  periodo: string
  onClose: () => void
}

/** AGR.6: ya tiene matrícula en el mismo grado y período; no se puede matricular. */
export function StudentAlreadyMatriculatedDialog({
  matricula,
  nombre,
  periodo,
  onClose,
}: StudentAlreadyMatriculatedDialogProps) {
  const gradeLabel = useMatriculaGradeLabel()
  const grado = gradeLabel(matricula.grade)
  return (
    <AlertDialog open onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Agregar estudiante — {nombre}</AlertDialogTitle>
          <AlertDialogDescription>
            No se puede matricular a {nombre} en {grado} · {periodo}: ya tiene una matrícula en ese mismo grado y
            período, en estado {matricula.status}, en {matricula.institution}.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 text-sm">
          <dt className="text-muted-foreground">Matrícula existente</dt>
          <dd className="flex flex-wrap items-center gap-2 font-medium">
            {[matricula.institution, grado, periodo].filter(Boolean).join(" · ")}
            <Badge variant="soft" color="info">
              {matricula.status}
            </Badge>
          </dd>
        </dl>

        <AlertDialogFooter>
          <Button type="button" variant="fill" color="primary" size="sm" onClick={onClose}>
            Entendido
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
