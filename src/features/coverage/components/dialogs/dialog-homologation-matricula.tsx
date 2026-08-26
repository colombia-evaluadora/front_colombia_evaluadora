import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
    <Dialog open>
      <DialogContent showCloseButton={false} className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircleFillIcon className="size-6 shrink-0 text-green" />
            <DialogTitle>Registro realizado</DialogTitle>
          </div>
          <DialogDescription>
            El estudiante <span className="font-semibold text-foreground">{fullName}</span> ha sido
            registrado correctamente en el grado{" "}
            <span className="font-semibold text-foreground">{formatGrade(matricula.grade)}</span>.
          </DialogDescription>
          <DialogDescription>
            Sin embargo, el sistema detectó que el estudiante cursó este{" "}
            <span className="font-semibold text-foreground">mismo grado</span> en la sede{" "}
            {homologation.previousCampus} y cuenta con{" "}
            <span className="font-semibold text-foreground">calificaciones registradas</span>.
          </DialogDescription>
        </DialogHeader>
        <p className="-mt-3 text-center text-base font-semibold text-foreground">
          ¿Desea homologar las calificaciones previas del estudiante?
        </p>
        <DialogFooter className="-mt-3 flex-row">
          <Button
            size="sm"
            type="button"
            variant="fill"
            color="primary"
            className="flex-1"
            onClick={() => onChoice(true)}
          >
            <CheckIcon data-icon="inline-start" />
            Sí, homologar las calificaciones
          </Button>
          <Button
            size="sm"
            type="button"
            variant="fill"
            color="neutral"
            className="flex-1"
            onClick={() => onChoice(false)}
          >
            <XIcon data-icon="inline-start" />
            No, no homologar ahora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
