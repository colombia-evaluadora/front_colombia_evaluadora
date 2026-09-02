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
  CheckIcon,
  ChartLineDownIcon,
  ChartLineUpIcon,
  FileUploadOutlinedIcon,
  InfoIcon,
  XIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { useMatriculaGradeLabel } from "@/features/coverage/hooks/use-matricula-grade-label"

export type GradeChangeKind = "promocion" | "correccion"
export type GradeChangeGradesAction = "eliminar" | "trasladar"
export function gradeChangeKindLabel(kind: GradeChangeKind, isSuperior: boolean): string {
  if (kind === "correccion") return "Corrección de matrícula"
  return isSuperior ? "Promoción anticipada" : "Reubicación académica"
}

export interface GradeChangeResult {
  kind: GradeChangeKind
  reason: string
  supportFile: File | null
  gradesAction: GradeChangeGradesAction
}

interface RadioCardOptionProps {
  value: string
  checked: boolean
  title: string
  description: string
}

function RadioCardOption({ value, checked, title, description }: RadioCardOptionProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 p-3",
        checked && "bg-primary/5",
      )}
    >
      <RadioGroupItem value={value} className="mt-0.5" />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

interface GradeChangeDialogProps {
  open: boolean
  currentGrade: number
  newGrade: number
  onConfirm: (result: GradeChangeResult) => void
  onCancel: () => void
}

const EMPTY_RESULT: Omit<GradeChangeResult, "kind"> = {
  reason: "",
  supportFile: null,
  gradesAction: "eliminar",
}

export function GradeChangeDialog({
  open,
  currentGrade,
  newGrade,
  onConfirm,
  onCancel,
}: GradeChangeDialogProps) {
  const gradeLabel = useMatriculaGradeLabel()
  const [kind, setKind] = useState<GradeChangeKind>("promocion")
  const [reason, setReason] = useState(EMPTY_RESULT.reason)
  const [supportFile, setSupportFile] = useState<File | null>(EMPTY_RESULT.supportFile)
  const [gradesAction, setGradesAction] = useState<GradeChangeGradesAction>(
    EMPTY_RESULT.gradesAction,
  )
  const reasonId = useId()

  function reset() {
    setKind("promocion")
    setReason(EMPTY_RESULT.reason)
    setSupportFile(EMPTY_RESULT.supportFile)
    setGradesAction(EMPTY_RESULT.gradesAction)
  }

  function handleCancel() {
    reset()
    onCancel()
  }

  function handleConfirm() {
    onConfirm({ kind, reason, supportFile, gradesAction })
    reset()
  }

  const isSuperior = newGrade > currentGrade

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleCancel()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSuperior ? (
              <ChartLineUpIcon className="size-5 text-primary" />
            ) : (
              <ChartLineDownIcon className="size-5 text-primary" />
            )}
            Cambio de grado
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            El nuevo grado ({gradeLabel(newGrade)}) es {isSuperior ? "superior" : "inferior"} al
            actual ({gradeLabel(currentGrade)})
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field variant="outlined">
            <FieldLabel>Seleccione cómo desea realizar el cambio</FieldLabel>
            <RadioGroup
              value={kind}
              onValueChange={(value) => {
                if (!value) return
                const nextKind = value as GradeChangeKind
                setKind(nextKind)
                if (nextKind === "correccion") {
                  setReason(EMPTY_RESULT.reason)
                  setSupportFile(EMPTY_RESULT.supportFile)
                }
              }}
              className="gap-0 divide-y divide-border overflow-hidden rounded-md border border-input"
            >
              <RadioCardOption
                value="promocion"
                checked={kind === "promocion"}
                title={gradeChangeKindLabel("promocion", isSuperior)}
                description={
                  isSuperior
                    ? "Avance académico antes de lo previsto."
                    : "Necesidad pedagógica o disciplinaria."
                }
              />
              <RadioCardOption
                value="correccion"
                checked={kind === "correccion"}
                title={gradeChangeKindLabel("correccion", isSuperior)}
                description={isSuperior ? "Ajuste administrativo sin promoción." : "Ajuste administrativo."}
              />
            </RadioGroup>
          </Field>

          {kind === "promocion" && (
            <>
              <Field variant="outlined">
                <FieldLabel htmlFor={reasonId}>Motivo de la reubicación</FieldLabel>
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
                <FieldLabel>Soporte (opcional)</FieldLabel>
                <FileUpload
                  value={supportFile ? [supportFile] : []}
                  onValueChange={(files) => setSupportFile(files[0] ?? null)}
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSize={10 * 1024 * 1024}
                  className={cn(
                    inputVariants({ variant: "outlined" }),
                    "flex-row items-center justify-between gap-2",
                  )}
                >
                  <span className="truncate text-sm text-muted-foreground">
                    {supportFile ? supportFile.name : "Subir archivo: PDF, JPG o PNG - Máx 10MB"}
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
              onValueChange={(value) => value && setGradesAction(value as GradeChangeGradesAction)}
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

          <div className="flex items-center gap-3 rounded-md border border-transparent bg-primary-22 px-4 py-1 text-sm font-medium text-primary">
            <InfoIcon className="size-5 shrink-0" />
            <span>Se registrará: {gradeChangeKindLabel(kind, isSuperior)}</span>
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
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
