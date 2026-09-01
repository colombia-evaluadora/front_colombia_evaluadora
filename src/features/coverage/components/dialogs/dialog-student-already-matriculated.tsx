import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { WarningCircleIcon, XIcon } from "@/components/ui/icons"

import { useMatriculaGradeLabel } from "@/features/coverage/hooks/use-matricula-grade-label"
import type { Matricula } from "@/features/coverage/api/types/matricula"

interface StudentAlreadyMatriculatedDialogProps {
  matricula: Matricula
  onClose: () => void
}

export function StudentAlreadyMatriculatedDialog({
  matricula,
  onClose,
}: StudentAlreadyMatriculatedDialogProps) {
  const gradeLabel = useMatriculaGradeLabel()
  return (
    <AlertDialog open onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <WarningCircleIcon className="size-5 text-yellow" />
            Estudiante ya matriculado
          </AlertDialogTitle>
          <AlertDialogDescription className="font-semibold text-foreground">
            El estudiante ya se encuentra matriculado para el año lectivo actual.
          </AlertDialogDescription>
          <AlertDialogDescription>
            No es posible crear un nuevo registro porque existe una matrícula en curso con los
            siguientes datos:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p>
            Sede: <span className="font-semibold text-foreground">{matricula.campus}</span>
          </p>
          <p>
            Grado: <span className="font-semibold text-foreground">{gradeLabel(matricula.grade)}</span>
          </p>
          <p>
            Grupo: <span className="font-semibold text-foreground">{matricula.group}</span>
          </p>
        </div>

        <AlertDialogFooter>
          <Button type="button" variant="fill" color="neutral" size="sm" onClick={onClose}>
            <XIcon data-icon="inline-start" />
            Cerrar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
