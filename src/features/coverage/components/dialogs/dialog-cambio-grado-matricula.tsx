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
  CheckIcon,
  ChartLineUpIcon,
  FileUploadOutlinedIcon,
  InfoIcon,
  XIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { useMatriculaGradeLabel } from "@/features/coverage/hooks/use-matricula-grade-label"
import type { BulkGradeChange, BulkGradeChangeSubKind, BulkGradesAction } from "@/features/coverage/api/types/matricula"

interface RadioCardOptionProps {
  value: string
  checked: boolean
  disabled?: boolean
  title: string
  description: string
}

function RadioCardOption({ value, checked, disabled, title, description }: RadioCardOptionProps) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 p-3",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        checked && "bg-primary/5",
      )}
    >
      <RadioGroupItem value={value} disabled={disabled} className="mt-0.5" />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

interface CambioGradoMatriculaDialogProps {
  open: boolean
  /** Todos los seleccionados comparten el mismo grado de origen — solo ahí
   * tiene sentido clasificar el cambio como Promoción/Reubicación (ver
   * `dialog-modificar-matricula.tsx`). */
  sameOrigin: boolean
  fromGrade: number | null
  toGrade: number
  onBack: () => void
  onConfirm: (result: BulkGradeChange) => void
  onClose: () => void
}

export function CambioGradoMatriculaDialog({
  open,
  sameOrigin,
  fromGrade,
  toGrade,
  onBack,
  onConfirm,
  onClose,
}: CambioGradoMatriculaDialogProps) {
  const gradeLabel = useMatriculaGradeLabel()
  const isSuperior = sameOrigin && fromGrade != null ? toGrade > fromGrade : null
  const directionalKind: BulkGradeChangeSubKind | null = isSuperior === null ? null : isSuperior ? "promocion" : "reubicacion"

  const [subKind, setSubKind] = useState<BulkGradeChangeSubKind>(directionalKind ?? "correccion")
  const [reason, setReason] = useState("")
  const [supportFile, setSupportFile] = useState<File | null>(null)
  const [gradesAction, setGradesAction] = useState<BulkGradesAction>(
    directionalKind === "reubicacion" ? "eliminar" : "noTrasladar",
  )
  const reasonId = useId()

  function reset() {
    setSubKind(directionalKind ?? "correccion")
    setReason("")
    setSupportFile(null)
    setGradesAction(directionalKind === "reubicacion" ? "eliminar" : "noTrasladar")
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleBack() {
    reset()
    onBack()
  }

  const needsDetails = subKind === "promocion" || subKind === "reubicacion"
  const canConfirm = !needsDetails || (reason.trim() !== "" && supportFile !== null)

  function handleConfirm() {
    if (!canConfirm) return
    onConfirm({
      subKind,
      reason: needsDetails ? reason : undefined,
      supportFile: needsDetails ? supportFile : undefined,
      gradesAction,
    })
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <ChartLineUpIcon className="size-5 text-primary" />
            Cambio de grado
          </DialogTitle>
          {sameOrigin && fromGrade != null ? (
            <p className="text-sm text-muted-foreground">
              El nuevo grado ({gradeLabel(toGrade)}) es {isSuperior ? "superior" : "inferior"} al
              actual ({gradeLabel(fromGrade)})
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Los estudiantes seleccionados no tienen el mismo grado de origen.
            </p>
          )}
        </DialogHeader>

        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 flex flex-col gap-4">
          {!sameOrigin && (
            <div className="flex items-start gap-3 rounded-md border border-blue-stroke bg-blue-22 px-4 py-3 text-sm text-foreground">
              <InfoIcon className="size-5 shrink-0 text-blue" />
              <p>
                Solo está habilitada <strong>Corrección de matrícula</strong> porque los estudiantes
                seleccionados no comparten el mismo grado — no se puede clasificar el cambio como
                Promoción anticipada ni Reubicación académica para todos por igual.
              </p>
            </div>
          )}

          <Field variant="outlined">
            <FieldLabel>Seleccione cómo desea realizar el cambio</FieldLabel>
            <RadioGroup
              value={subKind}
              onValueChange={(value) => {
                if (!value) return
                const nextKind = value as BulkGradeChangeSubKind
                setSubKind(nextKind)
                if (nextKind === "correccion") {
                  setReason("")
                  setSupportFile(null)
                }
              }}
              className="gap-0 divide-y divide-border overflow-hidden rounded-md border border-input"
            >
              {sameOrigin && directionalKind === "promocion" && (
                <RadioCardOption
                  value="promocion"
                  checked={subKind === "promocion"}
                  title="Promoción anticipada"
                  description="Avance académico antes de lo previsto."
                />
              )}
              {sameOrigin && directionalKind === "reubicacion" && (
                <RadioCardOption
                  value="reubicacion"
                  checked={subKind === "reubicacion"}
                  title="Reubicación académica"
                  description="Cambio de grado por reubicación del estudiante."
                />
              )}
              <RadioCardOption
                value="correccion"
                checked={subKind === "correccion"}
                title="Corrección de matrícula"
                description="Ajuste administrativo sin promoción ni reubicación."
              />
            </RadioGroup>
          </Field>

          {needsDetails && (
            <>
              <Field variant="outlined">
                <FieldLabel htmlFor={reasonId}>
                  Motivo de {subKind === "promocion" ? "la promoción" : "la reubicación"} (obligatorio)
                </FieldLabel>
                <Textarea
                  id={reasonId}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Nivelación de aprendizajes..."
                  rows={2}
                  className={cn(inputVariants({ variant: "outlined" }), "min-h-16 resize-none")}
                />
              </Field>

              <Field variant="outlined">
                <FieldLabel>Soporte (obligatorio)</FieldLabel>
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

          <Field variant="outlined">
            <FieldLabel>¿Qué desea hacer con las calificaciones?</FieldLabel>
            <RadioGroup
              value={gradesAction}
              onValueChange={(value) => value && setGradesAction(value as BulkGradesAction)}
              className="flex min-h-11 flex-row flex-wrap items-center gap-6 rounded-md border border-input px-3"
            >
              {subKind === "reubicacion" ? (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="eliminar" />
                    Eliminar calificaciones
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="trasladar" />
                    Trasladar calificaciones al nuevo grupo
                  </label>
                </>
              ) : (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="noTrasladar" />
                    No trasladar calificaciones
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="trasladar" />
                    Trasladar calificaciones al nuevo grupo
                  </label>
                </>
              )}
            </RadioGroup>
          </Field>
        </div>

        <DialogFooter className="shrink-0 px-6 pb-6 sm:justify-end">
          <Button type="button" variant="outline" color="primary" size="sm" onClick={handleBack}>
            <ArrowLeftIcon data-icon="inline-start" />
            Anterior
          </Button>
          <Button type="button" color="primary" size="sm" disabled={!canConfirm} onClick={handleConfirm}>
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
