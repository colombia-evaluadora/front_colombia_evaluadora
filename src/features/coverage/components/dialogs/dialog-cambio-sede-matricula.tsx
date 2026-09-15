import { useId, useState } from "react"

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
import { Textarea } from "@/components/ui/textarea"
import { inputVariants } from "@/components/ui/input"
import { FileUpload, FileUploadTrigger } from "@/components/ui/file-upload"
import {
  ArrowLeftIcon,
  BankIcon,
  CheckIcon,
  FileUploadOutlinedIcon,
  InfoIcon,
  XIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { useMatriculaGradeLabel } from "@/features/coverage/hooks/use-matricula-grade-label"
import type { BulkGroupChangeClassification } from "@/features/coverage/api/types/matricula"

export interface CambioSedeConfirmResult {
  classification: BulkGroupChangeClassification
  reason: string
  supportFile: File | null
}

interface CambioSedeMatriculaDialogProps {
  open: boolean
  fromSede: string
  toSede: string
  fromGrade: number
  toGrade: number
  fromGroup: string
  toGroup: string
  gradeWillChange: boolean
  sameOrigin: boolean
  onBack?: () => void
  onConfirm: (result: CambioSedeConfirmResult) => void
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
  const gradeLabel = useMatriculaGradeLabel()
  const defaultClassification = sameOrigin && gradeWillChange ? "cambioGrado" : "correccion"
  const [classification, setClassification] = useState<BulkGroupChangeClassification>(defaultClassification)
  const [reason, setReason] = useState("")
  const [supportFile, setSupportFile] = useState<File | null>(null)
  const reasonId = useId()

  function reset() {
    setClassification(defaultClassification)
    setReason("")
    setSupportFile(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleConfirm() {
    onConfirm({ classification, reason, supportFile })
    reset()
  }

  const isReubicacion = classification === "cambioGrado"
  const canConfirm = !isReubicacion || (reason.trim() !== "" && supportFile != null)

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-xl" showCloseButton={false}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BankIcon className="size-5 text-primary" />
            Cambio de sede
          </DialogTitle>
        </DialogHeader>

        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 flex flex-col gap-4">
          <div className="rounded-md border border-input bg-muted/30 p-4">
            <p className="mb-1 text-sm font-semibold text-foreground">
              Cambios a aplicar - Cambio de sede:
            </p>
            <ul className="flex list-disc flex-col gap-0 pl-5 text-sm text-foreground leading-tight">
              <ComparisonLine label="Sede" from={fromSede} to={toSede} />
              <ComparisonLine
                label="Grado"
                from={gradeLabel(fromGrade)}
                to={gradeLabel(toGrade)}
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

          {isReubicacion && (
            <>
              <Field variant="outlined">
                <FieldLabel htmlFor={reasonId}>Motivo de la reubicación*</FieldLabel>
                <Textarea
                  id={reasonId}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Traslado por cambio de domicilio..."
                  rows={2}
                  className={cn(inputVariants({ variant: "outlined" }), "min-h-16 resize-none")}
                />
              </Field>

              <Field variant="outlined">
                <FieldLabel>Soporte*</FieldLabel>
                <FileUpload
                  value={supportFile ? [supportFile] : []}
                  onValueChange={(files) => setSupportFile(files[0] ?? null)}
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSize={25 * 1024 * 1024}
                  className={cn(
                    inputVariants({ variant: "outlined" }),
                    "flex-row items-center justify-between gap-2",
                  )}
                >
                  <span className="truncate text-sm text-muted-foreground">
                    {supportFile ? supportFile.name : "Subir archivo: PDF, JPG o PNG - Máx 25MB"}
                  </span>
                  <FileUploadTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        color="neutral"
                        size="icon-sm"
                        aria-label="Adjuntar soporte"
                      />
                    }
                  >
                    <FileUploadOutlinedIcon />
                  </FileUploadTrigger>
                </FileUpload>
              </Field>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 sm:justify-end">
          {onBack && (
            <Button type="button" variant="outline" color="primary" size="sm" onClick={onBack}>
              <ArrowLeftIcon data-icon="inline-start" />
              Anterior
            </Button>
          )}
          <Button type="button" color="primary" size="sm" disabled={!canConfirm} onClick={handleConfirm}>
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
