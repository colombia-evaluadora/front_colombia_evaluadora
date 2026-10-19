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
  ChartLineDownIcon,
  ChartLineUpIcon,
  FileUploadOutlinedIcon,
  InfoIcon,
  XIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { useMatriculaGradeLabel } from "@/features/coverage/matricula/hooks/use-matricula-grade-label"
import type { MatriculaMoveKind } from "@/features/coverage/matricula/api/mutations/move-matricula"
import type { BulkGradeChange, BulkGradeChangeSubKind, BulkGradesAction } from "@/features/coverage/matricula/api/types/matricula"

// Resultado del modo individual: "promocion" cubre también la reubicación (grado inferior)
export type GradeChangeKind = "promocion" | "correccion"
export type GradeChangeGradesAction = "eliminar" | "trasladar"

export function gradeChangeKindLabel(kind: GradeChangeKind, isSuperior: boolean): string {
  if (kind === "correccion") return "Corrección de matrícula"
  return isSuperior ? "Promoción anticipada" : "Reubicación académica"
}

export function moveKindForGradeChange(kind: GradeChangeKind, isSuperior: boolean): MatriculaMoveKind {
  if (kind === "correccion") return "corregir"
  return isSuperior ? "promover" : "reubicar"
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
    <label className={cn("flex cursor-pointer items-start gap-3 p-3", checked && "bg-primary/5")}>
      <RadioGroupItem value={value} className="mt-0.5" />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

interface BaseProps {
  open: boolean
  toGrade: number
  onClose: () => void
}

/** Cambio masivo (`dialog-modificar-matricula.tsx`). */
interface MasivoProps extends BaseProps {
  modo: "masivo"
  /** Solo con mismo grado de origen se clasifica como Promoción/Reubicación. */
  sameOrigin: boolean
  fromGrade: number | null
  onBack: () => void
  onConfirm: (result: BulkGradeChange) => void
}

/** Edición de una matrícula (`matricula-edit-page.tsx`). */
interface IndividualProps extends BaseProps {
  modo: "individual"
  fromGrade: number
  onConfirm: (result: GradeChangeResult) => void
}

type CambioGradoMatriculaDialogProps = MasivoProps | IndividualProps

export function CambioGradoMatriculaDialog(props: CambioGradoMatriculaDialogProps) {
  const { open, toGrade, fromGrade, onClose } = props
  const masivo = props.modo === "masivo"
  const sameOrigin = masivo ? props.sameOrigin : true
  const gradeLabel = useMatriculaGradeLabel()
  const isSuperior = sameOrigin && fromGrade != null ? toGrade > fromGrade : null
  const directionalKind: BulkGradeChangeSubKind | null =
    isSuperior === null ? null : isSuperior ? "promocion" : "reubicacion"

  // El modo individual siempre arranca en "eliminar"
  const initialGradesAction: BulkGradesAction =
    !masivo || directionalKind === "reubicacion" ? "eliminar" : "noTrasladar"

  const [subKind, setSubKind] = useState<BulkGradeChangeSubKind>(directionalKind ?? "correccion")
  const [reason, setReason] = useState("")
  const [supportFile, setSupportFile] = useState<File | null>(null)
  const [gradesAction, setGradesAction] = useState<BulkGradesAction>(initialGradesAction)
  const reasonId = useId()

  function reset() {
    setSubKind(directionalKind ?? "correccion")
    setReason("")
    setSupportFile(null)
    setGradesAction(initialGradesAction)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleBack() {
    reset()
    if (props.modo === "masivo") props.onBack()
  }

  const needsDetails = subKind === "promocion" || subKind === "reubicacion"
  const canConfirm = !needsDetails || (reason.trim() !== "" && supportFile !== null)

  function handleConfirm() {
    if (!canConfirm) return
    if (props.modo === "masivo") {
      props.onConfirm({
        subKind,
        reason: needsDetails ? reason : undefined,
        supportFile: needsDetails ? supportFile : undefined,
        gradesAction,
      })
    } else {
      props.onConfirm({
        kind: needsDetails ? "promocion" : "correccion",
        reason,
        supportFile,
        gradesAction: gradesAction as GradeChangeGradesAction,
      })
    }
    reset()
  }

  // Textos propios de cada modo (se mantienen tal cual estaban)
  const directionalDescription = masivo
    ? subKindDescriptionMasivo(directionalKind)
    : isSuperior
      ? "Avance académico antes de lo previsto."
      : "Necesidad pedagógica o disciplinaria."
  const correccionDescription = masivo
    ? "Ajuste administrativo sin promoción ni reubicación."
    : isSuperior
      ? "Ajuste administrativo sin promoción."
      : "Ajuste administrativo."
  const reasonLabel = masivo
    ? `Motivo de ${subKind === "promocion" ? "la promoción" : "la reubicación"} (obligatorio)`
    : `Motivo de ${isSuperior ? "la promoción" : "la reubicación"}*`
  const supportLabel = masivo ? "Soporte (obligatorio)" : "Soporte*"
  const showEliminar = masivo ? subKind === "reubicacion" : true
  const kindForLabel: GradeChangeKind = needsDetails ? "promocion" : "correccion"

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            {masivo || isSuperior ? (
              <ChartLineUpIcon className="size-5 text-primary" />
            ) : (
              <ChartLineDownIcon className="size-5 text-primary" />
            )}
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
                // En masivo la opción "Eliminar" solo existe en reubicación: no dejar el radio sin marcar.
                if (masivo && gradesAction !== "trasladar") {
                  setGradesAction(nextKind === "reubicacion" ? "eliminar" : "noTrasladar")
                }
                if (nextKind === "correccion") {
                  setReason("")
                  setSupportFile(null)
                }
              }}
              className="gap-0 divide-y divide-border overflow-hidden rounded-md border border-input"
            >
              {directionalKind && isSuperior !== null && (
                <RadioCardOption
                  value={directionalKind}
                  checked={subKind === directionalKind}
                  title={gradeChangeKindLabel("promocion", isSuperior)}
                  description={directionalDescription}
                />
              )}
              <RadioCardOption
                value="correccion"
                checked={subKind === "correccion"}
                title="Corrección de matrícula"
                description={correccionDescription}
              />
            </RadioGroup>
          </Field>

          {needsDetails && (
            <>
              <Field variant="outlined">
                <FieldLabel htmlFor={reasonId}>{reasonLabel}</FieldLabel>
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
                <FieldLabel>{supportLabel}</FieldLabel>
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
              className={cn(
                "flex min-h-11 flex-row items-center gap-6 rounded-md border border-input px-3",
                masivo && "flex-wrap",
              )}
            >
              {showEliminar ? (
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="eliminar" />
                  Eliminar calificaciones
                </label>
              ) : (
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="noTrasladar" />
                  No trasladar calificaciones
                </label>
              )}
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="trasladar" />
                Trasladar calificaciones al nuevo grupo
              </label>
            </RadioGroup>
          </Field>

          {!masivo && isSuperior !== null && (
            <div className="flex items-center gap-3 rounded-md border border-transparent bg-primary-22 px-4 py-1 text-sm font-medium text-primary">
              <InfoIcon className="size-5 shrink-0" />
              <span>Se registrará: {gradeChangeKindLabel(kindForLabel, isSuperior)}</span>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 px-6 pb-6 sm:justify-end">
          {masivo && (
            <Button type="button" variant="outline" color="primary" size="sm" onClick={handleBack}>
              <ArrowLeftIcon data-icon="inline-start" />
              Anterior
            </Button>
          )}
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

function subKindDescriptionMasivo(kind: BulkGradeChangeSubKind | null): string {
  return kind === "promocion"
    ? "Avance académico antes de lo previsto."
    : "Cambio de grado por reubicación del estudiante."
}
