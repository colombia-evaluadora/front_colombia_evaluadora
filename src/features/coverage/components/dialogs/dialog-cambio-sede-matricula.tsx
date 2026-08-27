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
import { ArrowLeftIcon, BankIcon, CheckIcon, InfoIcon, XIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { formatGrade } from "@/features/coverage/api/ui-mappings"
import type { BulkGroupChangeClassification } from "@/features/coverage/api/types/matricula"

interface CambioSedeMatriculaDialogProps {
  open: boolean
  fromSede: string
  toSede: string
  fromGrade: number
  toGrade: number
  fromGroup: string
  toGroup: string
  /** El Grado también cambia en esta misma operación — define el valor por
   * defecto del radio de abajo (el usuario lo puede cambiar igual). */
  gradeWillChange: boolean
  /** Todos los estudiantes seleccionados comparten el mismo grado de
   * origen — si no, "Reubicación de sede" se deshabilita (mismo criterio
   * que `dialog-cambio-grado-matricula.tsx`: no se puede reubicar de forma
   * consistente un lote con grados de origen distintos). */
  sameOrigin: boolean
  /** Solo el diálogo "Modificar" en lote tiene un paso previo al que volver
   * — en la edición individual no hay wizard, así que se omite el botón. */
  onBack?: () => void
  onConfirm: (classification: BulkGroupChangeClassification) => void
  onClose: () => void
}

function ComparisonLine({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <li>
      <span className="font-medium">{label}:</span> {from} {from === to ? "=" : "→"}{" "}
      <strong>{to}</strong>
    </li>
  )
}

export function CambioSedeMatriculaDialog({
  open,
  fromSede,
  toSede,
  fromGrade,
  toGrade,
  fromGroup,
  toGroup,
  gradeWillChange,
  sameOrigin,
  onBack,
  onConfirm,
  onClose,
}: CambioSedeMatriculaDialogProps) {
  const defaultClassification = sameOrigin && gradeWillChange ? "cambioGrado" : "correccion"
  const [classification, setClassification] = useState<BulkGroupChangeClassification>(defaultClassification)

  function reset() {
    setClassification(defaultClassification)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleConfirm() {
    onConfirm(classification)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BankIcon className="size-5 text-primary" />
            Cambio de sede
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-input bg-muted/30 p-4">
            <p className="mb-1 text-sm font-semibold text-foreground">
              Cambios a aplicar - Cambio de sede:
            </p>
            <ul className="flex list-disc flex-col gap-0 pl-5 text-sm text-foreground leading-tight">
              <ComparisonLine label="Sede" from={fromSede} to={toSede} />
              <ComparisonLine
                label="Grado"
                from={formatGrade(fromGrade)}
                to={formatGrade(toGrade)}
              />
              <ComparisonLine label="Grupo" from={fromGroup} to={toGroup} />
            </ul>
          </div>

          {!sameOrigin && (
            <div className="flex items-start gap-3 rounded-md border border-blue-stroke bg-blue-22 px-4 py-3 text-sm text-foreground">
              <InfoIcon className="size-5 shrink-0 text-blue" />
              <p>
                Solo está habilitada <strong>Corrección</strong> porque los estudiantes seleccionados
                no comparten el mismo grado de origen — no se puede clasificar el cambio como
                Reubicación de sede para todos por igual.
              </p>
            </div>
          )}

          <Field variant="outlined">
            <FieldLabel>¿Cómo se registra este movimiento?</FieldLabel>
            <RadioGroup
              value={classification}
              onValueChange={(value) => value && setClassification(value as BulkGroupChangeClassification)}
              className="flex min-h-20 flex-row flex-wrap items-center gap-6 rounded-md border border-input px-4"
            >
              <label
                className={cn(
                  "flex items-center gap-2 text-sm",
                  !sameOrigin && "cursor-not-allowed opacity-50",
                )}
              >
                <RadioGroupItem value="cambioGrado" disabled={!sameOrigin} />
                Reubicación de sede
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
            Confirmar cambio de sede
          </Button>
          <DialogClose render={<Button size="sm" type="button" variant="fill" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cerrar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
