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
import { ArrowLeftIcon, CheckIcon, InfoIcon, UsersThreeIcon, XIcon } from "@/components/ui/icons"
import type {
  BulkGradeChange,
  BulkGroupChange,
  BulkGroupChangeClassification,
} from "@/features/coverage/matricula/api/types/matricula"

export type GroupChangeGradesAction = "eliminar" | "trasladar"

export interface GroupChangeResult {
  gradesAction: GroupChangeGradesAction | null
}

interface BaseProps {
  open: boolean
  toGroup: string
  onClose: () => void
}

/** Cambio masivo: se elige cómo clasificar el movimiento. */
interface MasivoProps extends BaseProps {
  modo: "masivo"
  studentCount: number
  /** Cambio de grado confirmado en el paso anterior, o `null` si solo cambia el grupo. */
  gradeChange: BulkGradeChange | null
  /** Solo si hay un paso anterior al que volver. */
  onBack?: () => void
  onConfirm: (result: BulkGroupChange) => void
}

/** Edición individual: solo se dispara sin cambio de sede ni grado, así que siempre es corrección. */
interface IndividualProps extends BaseProps {
  modo: "individual"
  fromGroup: string
  hasGrades: boolean
  onConfirm: (result: GroupChangeResult) => void
}

type CambioGrupoMatriculaDialogProps = MasivoProps | IndividualProps

export function CambioGrupoMatriculaDialog(props: CambioGrupoMatriculaDialogProps) {
  const { open, toGroup, onClose } = props
  const masivo = props.modo === "masivo"
  // Masivo: por defecto sigue el paso de Grado, pero el usuario puede cambiarlo
  const initialClassification: BulkGroupChangeClassification =
    props.modo === "masivo" && props.gradeChange ? "cambioGrado" : "correccion"
  const [classification, setClassification] = useState(initialClassification)
  const [gradesAction, setGradesAction] = useState<GroupChangeGradesAction>("eliminar")

  function reset() {
    setClassification(initialClassification)
    setGradesAction("eliminar")
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleConfirm() {
    if (props.modo === "masivo") props.onConfirm({ classification })
    else props.onConfirm({ gradesAction: props.hasGrades ? gradesAction : null })
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent
        className={
          masivo
            ? "max-h-[90vh] overflow-y-auto sm:max-w-xl"
            : "flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-xl"
        }
        showCloseButton={false}
      >
        <DialogHeader className={masivo ? undefined : "shrink-0 px-6 pt-6"}>
          <DialogTitle className="flex items-center gap-2">
            <UsersThreeIcon className="size-5 text-primary" />
            Cambio de grupo
          </DialogTitle>
          {props.modo === "masivo" ? (
            <p className="text-sm text-muted-foreground">
              Nuevo grupo <strong>{toGroup}</strong> para {props.studentCount} estudiante
              {props.studentCount === 1 ? "" : "s"}.
            </p>
          ) : props.hasGrades ? (
            <>
              <p className="text-sm text-muted-foreground">Se detectaron calificaciones registradas</p>
              <p className="text-sm text-muted-foreground">
                El estudiante tiene calificaciones en el período actual.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nuevo grupo <strong>{toGroup}</strong> (antes <strong>{props.fromGroup}</strong>).
            </p>
          )}
        </DialogHeader>

        {props.modo === "masivo" ? (
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
        ) : (
          <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 flex flex-col gap-4">
            {props.hasGrades && (
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
        )}

        <DialogFooter className={masivo ? "sm:justify-end" : "shrink-0 px-6 pb-6 sm:justify-end"}>
          {props.modo === "masivo" && props.onBack && (
            <Button type="button" variant="outline" color="primary" size="sm" onClick={props.onBack}>
              <ArrowLeftIcon data-icon="inline-start" />
              Anterior
            </Button>
          )}
          <Button type="button" color="primary" size="sm" onClick={handleConfirm}>
            <CheckIcon data-icon="inline-start" />
            {masivo ? "Confirmar cambio de grupo" : "Confirmar cambio"}
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
