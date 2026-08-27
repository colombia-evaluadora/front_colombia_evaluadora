import { useState } from "react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowLeftIcon, CheckIcon, UsersThreeIcon, XIcon } from "@/components/ui/icons"
import type {
  BulkGradeChange,
  BulkGroupChange,
  BulkGroupChangeClassification,
} from "@/features/coverage/api/types/matricula"

interface CambioGrupoMatriculaDialogProps {
  open: boolean
  toGroup: string
  studentCount: number
  /** Si el Grado también cambió en esta misma operación (paso anterior de la
   * cadena), el grupo va de la mano de esa clasificación — no es una
   * corrección aparte. `null` cuando el grupo es el único cambio (ver
   * `dialog-modificar-matricula.tsx`). */
  gradeChange: BulkGradeChange | null
  /** Solo cuando este diálogo va después del de Sede/Grado en la cadena —
   * si es el primer paso no hay a dónde volver. */
  onBack?: () => void
  onConfirm: (result: BulkGroupChange) => void
  onClose: () => void
}

export function CambioGrupoMatriculaDialog({
  open,
  toGroup,
  studentCount,
  gradeChange,
  onBack,
  onConfirm,
  onClose,
}: CambioGrupoMatriculaDialogProps) {
  // Por defecto sigue lo que ya se confirmó en el paso de Grado (si lo
  // hubo) — pero el usuario puede cambiarlo, no es un cálculo fijo.
  const [classification, setClassification] = useState<BulkGroupChangeClassification>(
    gradeChange ? "cambioGrado" : "correccion",
  )

  function reset() {
    setClassification(gradeChange ? "cambioGrado" : "correccion")
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleConfirm() {
    onConfirm({ classification })
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersThreeIcon className="size-5 text-primary" />
            Cambio de grupo
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Nuevo grupo <strong>{toGroup}</strong> para {studentCount} estudiante
            {studentCount === 1 ? "" : "s"}.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field variant="outlined">
            <FieldLabel>¿Cómo se registra este movimiento?</FieldLabel>
            <RadioGroup
              value={classification}
              onValueChange={(value) => value && setClassification(value as BulkGroupChangeClassification)}
              className="flex min-h-20 flex-row flex-wrap items-center gap-6 rounded-md border border-input px-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="cambioGrado" />
                Cambio de grado
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="correccion" />
                Corrección
              </label>
            </RadioGroup>
          </Field>
        </div>

        <DialogFooter className="sm:justify-end">
          {onBack && (
            <Button type="button" variant="outline" color="primary" size="sm" onClick={onBack}>
              <ArrowLeftIcon data-icon="inline-start" />
              Anterior
            </Button>
          )}
          <Button type="button" color="primary" size="sm" onClick={handleConfirm}>
            <CheckIcon data-icon="inline-start" />
            Confirmar cambio de grupo
          </Button>
          <DialogClose render={<Button size="sm" type="button" variant="fill" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
