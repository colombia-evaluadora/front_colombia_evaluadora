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
import { CheckIcon, InfoIcon, UsersThreeIcon, XIcon } from "@/components/ui/icons"

export type GroupChangeGradesAction = "eliminar" | "trasladar"

export interface GroupChangeResult {
  gradesAction: GroupChangeGradesAction | null
}

interface GroupChangeDialogProps {
  open: boolean
  currentGroup: string
  newGroup: string
  hasGrades: boolean
  onConfirm: (result: GroupChangeResult) => void
  onCancel: () => void
}

const EMPTY_GRADES_ACTION: GroupChangeGradesAction = "eliminar"

/**
 * Cambio de grupo individual (edición de una matrícula) -- solo se dispara
 * cuando Sede y Grado NO cambiaron (ver `matricula-edit-page.tsx`): un
 * cambio de grupo aislado siempre es una corrección administrativa, así que
 * a diferencia de `GradeChangeDialog` no hay elección de tipo de movimiento.
 */
export function GroupChangeDialog({
  open,
  currentGroup,
  newGroup,
  hasGrades,
  onConfirm,
  onCancel,
}: GroupChangeDialogProps) {
  const [gradesAction, setGradesAction] = useState<GroupChangeGradesAction>(EMPTY_GRADES_ACTION)

  function reset() {
    setGradesAction(EMPTY_GRADES_ACTION)
  }

  function handleCancel() {
    reset()
    onCancel()
  }

  function handleConfirm() {
    onConfirm({ gradesAction: hasGrades ? gradesAction : null })
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleCancel()
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <UsersThreeIcon className="size-5 text-primary" />
            Cambio de grupo
          </DialogTitle>
          {hasGrades ? (
            <>
              <p className="text-sm text-muted-foreground">Se detectaron calificaciones registradas</p>
              <p className="text-sm text-muted-foreground">
                El estudiante tiene calificaciones en el período actual.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nuevo grupo <strong>{newGroup}</strong> (antes <strong>{currentGroup}</strong>).
            </p>
          )}
        </DialogHeader>

        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 flex flex-col gap-4">
          {hasGrades && (
            <Field variant="outlined">
              <FieldLabel>¿Qué desea hacer con las calificaciones?</FieldLabel>
              <RadioGroup
                value={gradesAction}
                onValueChange={(value) => value && setGradesAction(value as GroupChangeGradesAction)}
                className="flex min-h-11 flex-row items-center gap-6 rounded-md border border-input px-3"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="eliminar" />
                  Eliminar calificaciones
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="trasladar" />
                  Trasladar calificaciones al nuevo grupo
                </label>
              </RadioGroup>
            </Field>
          )}

          <div className="flex items-center gap-3 rounded-md border border-transparent bg-primary-22 px-4 py-1 text-sm font-medium text-primary">
            <InfoIcon className="size-5 shrink-0" />
            <span>Se aplicará: Corrección de matrícula (Cambio de grupo)</span>
          </div>
        </div>

        <DialogFooter className="shrink-0 px-6 pb-6 sm:justify-end">
          <Button type="button" color="primary" size="sm" onClick={handleConfirm}>
            <CheckIcon data-icon="inline-start" />
            Confirmar cambio
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
