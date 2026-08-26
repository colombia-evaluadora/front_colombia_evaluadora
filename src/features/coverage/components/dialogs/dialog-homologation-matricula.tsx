import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { CheckCircleFillIcon, CheckIcon, XIcon } from "@/components/ui/icons"

import { formatGrade } from "@/features/coverage/api/ui-mappings"
import type { Matricula, MatriculaHomologationInfo } from "@/features/coverage/api/types/matricula"

interface HomologationMatriculaDialogProps {
  matricula: Matricula
  homologation: MatriculaHomologationInfo
  onChoice: (homologate: boolean) => void
}

/**
 * Se abre solo cuando el mock detecta que el estudiante ya cursó este grado
 * en otra sede (`homologation` no nulo) — la confirmación normal de "Guardado"
 * no alcanza porque acá hay una decisión que tomar antes de cerrar el alta.
 * No tiene `onOpenChange`/botón de cerrar: la única forma de avanzar es
 * eligiendo una de las dos opciones (ver `onChoice`).
 */
export function HomologationMatriculaDialog({
  matricula,
  homologation,
  onChoice,
}: HomologationMatriculaDialogProps) {
  const fullName = `${matricula.firstName} ${matricula.lastName}`

  return (
    <AlertDialog open>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="items-center sm:text-center">
          <CheckCircleFillIcon className="size-12 text-green" />
          <AlertDialogTitle>Registro realizado</AlertDialogTitle>
          <AlertDialogDescription>
            El estudiante {fullName} ha sido registrado correctamente en el grado{" "}
            {formatGrade(matricula.grade)}.
          </AlertDialogDescription>
          <AlertDialogDescription>
            Sin embargo, el sistema detectó que el estudiante cursó este mismo grado en la sede{" "}
            {homologation.previousCampus} y cuenta con calificaciones registradas.
          </AlertDialogDescription>
          <AlertDialogDescription className="font-medium text-foreground">
            ¿Desea homologar las calificaciones previas del estudiante?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-col">
          <Button
            type="button"
            variant="fill"
            color="primary"
            className="w-full"
            onClick={() => onChoice(true)}
          >
            <CheckIcon data-icon="inline-start" />
            Sí, homologar las calificaciones
          </Button>
          <Button
            type="button"
            variant="outline"
            color="neutral"
            className="w-full"
            onClick={() => onChoice(false)}
          >
            <XIcon data-icon="inline-start" />
            No, no homologar ahora
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
