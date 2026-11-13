import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "@/components/ui/file-upload"
import {
  ArrowCounterClockwiseIcon,
  FileUploadOutlinedIcon,
  ProhibitIcon,
  SpinnerIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import {
  usePreviaReactivarQuery,
  useReactivarMatricula,
  type DecisionRegistros,
  type PreviaReactivar,
} from "@/features/coverage/matricula/api/reactivar"
import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"
import { useMatriculaGradeLabel } from "@/features/coverage/matricula/hooks/use-matricula-grade-label"

const MOTIVO_MIN = 10
const MOTIVO_MAX = 500
const SOPORTE_EXTENSIONES = ["pdf", "jpg", "jpeg", "png"]
const SOPORTE_MAX_MB = 10

interface Props {
  matricula: Matricula
  onOpenChange: (open: boolean) => void
  onDone: (mensaje: string) => void
}

/** Por qué no se puede reactivar, con el texto del doc; null si se puede. */
function bloqueo(p: PreviaReactivar): string | null {
  if (!p.periodoAbierto) return "No se puede reactivar la matrícula porque su Período Académico ya está cerrado."
  if (p.promovidoAreasPendientes)
    return "No se puede reactivar la matrícula porque tiene la marca Promovido con áreas pendientes. Primero anule la promoción."
  if (p.tieneMatriculaSiguiente)
    return "No se puede reactivar la matrícula porque el estudiante ya tiene matrícula en el período siguiente."
  return null
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/**
 * Reactivar matrícula (Sección 4.4, Regla 15): corrige un estado final puesto
 * por error y la devuelve a Cursando. Si era Promovida o Reubicada, la
 * matrícula del cambio de grado pasa a Anulado; con registros propios se
 * decide Homologar de vuelta o Descartar. Si no se puede, el modal es un
 * bloqueo de un solo botón.
 */
export function DialogReactivarMatricula({ matricula, onOpenChange, onDone }: Props) {
  const { data: previa, isPending, isError, error: errorCarga } = usePreviaReactivarQuery(matricula.id)
  const reactivar = useReactivarMatricula()
  const gradeLabel = useMatriculaGradeLabel()
  const [motivo, setMotivo] = useState("")
  const [soporte, setSoporte] = useState<File | null>(null)
  const [decision, setDecision] = useState<DecisionRegistros>("HOMOLOGAR")
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const nombre = `${matricula.firstName} ${matricula.lastName}`

  const motivoValido = motivo.trim().length >= MOTIVO_MIN && motivo.trim().length <= MOTIVO_MAX
  const bloqueado = previa ? bloqueo(previa) : null
  const nueva = previa?.matriculaNueva ?? null
  const pideDecision = Boolean(nueva?.registrosPropios)

  function elegirSoporte(file: File | undefined) {
    if (!file) return
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!SOPORTE_EXTENSIONES.includes(ext)) {
      setError({ id: Date.now(), message: "El soporte debe ser un archivo PDF, JPG o PNG." })
      return
    }
    if (file.size > SOPORTE_MAX_MB * 1024 * 1024) {
      setError({ id: Date.now(), message: `El soporte supera los ${SOPORTE_MAX_MB} MB.` })
      return
    }
    setSoporte(file)
  }

  function confirmar() {
    setIntentado(true)
    if (bloqueado || !motivoValido) return
    reactivar.mutate(
      { matriculaId: matricula.id, motivo, soporte, decision: pideDecision ? decision : null },
      {
        onSuccess: () => onDone(`La matrícula de ${nombre} volvió a Cursando.`),
        onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
      },
    )
  }

  const titulo = (
    <div className="flex items-center gap-2">
      {bloqueado ? (
        <ProhibitIcon className="size-6 shrink-0 text-red" aria-hidden />
      ) : (
        <WarningIcon className="size-6 shrink-0 text-yellow" aria-hidden />
      )}
      <DialogTitle>Reactivar matrícula — {nombre}</DialogTitle>
    </div>
  )

  // Bloqueo de un solo botón (Sección 4.4).
  if (previa && bloqueado) {
    const siguiente = previa.matriculaSiguiente
    return (
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            {titulo}
            <DialogDescription>{bloqueado}</DialogDescription>
          </DialogHeader>
          {siguiente ? (
            <dl className="grid grid-cols-[auto_1fr] overflow-hidden rounded-md border border-border text-sm">
              <dt className="bg-muted/40 px-4 py-2.5 text-muted-foreground">Matrícula en el período siguiente</dt>
              <dd className="flex flex-col items-start gap-1 px-4 py-2.5">
                {[siguiente.periodo, gradeLabel(siguiente.grado), siguiente.grupo].join(" · ")}
                <Badge variant="soft" color="success" className="rounded-full text-xs font-medium tracking-normal">
                  {siguiente.estado}
                </Badge>
              </dd>
            </dl>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="fill" color="primary" size="sm" onClick={() => onOpenChange(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !reactivar.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          {titulo}
          {previa ? (
            <DialogDescription>
              La matrícula vuelve a Cursando
              {nueva ? `; la matrícula de ${gradeLabel(nueva.grado)} pasa a Anulado.` : "."}
              {!nueva ? " Al corregir sus notas se vuelve a ejecutar su cierre académico y se reajusta su reserva." : ""}
              {previa.tieneComplementaria
                ? nueva
                  ? " Su matrícula complementaria vuelve a como estaba antes del cambio de grado: verifíquela."
                  : " Su matrícula complementaria también vuelve a Cursando."
                : ""}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        {isPending ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <SpinnerIcon className="animate-spin" /> Revisando la matrícula…
          </div>
        ) : isError ? (
          <p className="p-6 text-center text-sm text-red">{getErrorMessage(errorCarga)}</p>
        ) : (
          <>
            {pideDecision && nueva ? (
              <>
                <div className="flex gap-3 rounded-md border border-yellow-stroke bg-yellow-22 px-4 py-3 text-sm">
                  <WarningCircleIcon className="mt-0.5 size-4 shrink-0 text-yellow" aria-hidden />
                  <p>
                    La matrícula de {gradeLabel(nueva.grado)} · {nueva.grupo} ya tiene registros propios en Gestión
                    Académica
                    {nueva.registros
                      ? `: resultados de ${plural(nueva.registros.actividades, "actividad", "actividades")} y asistencia de ${plural(nueva.registros.clases, "clase", "clases")}.`
                      : "."}
                  </p>
                </div>

                <Field variant="outlined">
                  <FieldLabel>
                    Registros de la matrícula nueva<span data-required-mark="">*</span>
                  </FieldLabel>
                  <RadioGroup
                    value={decision}
                    onValueChange={(v) => v && setDecision(v as DecisionRegistros)}
                    className="flex flex-col gap-3 pt-1"
                  >
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <RadioGroupItem value="HOMOLOGAR" className="mt-0.5" />
                      <span>
                        <span className="font-semibold">Homologar de vuelta</span>
                        <span className="text-muted-foreground">
                          {" "}
                          — sus definitivas pasan a la matrícula de {gradeLabel(matricula.grade)}, con el emparejamiento
                          confirmado.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <RadioGroupItem value="DESCARTAR" className="mt-0.5" />
                      <span>
                        <span className="font-semibold">Descartar</span>
                        <span className="text-muted-foreground">
                          {" "}
                          — sus registros quedan Anulados por reactivación, en la Bitácora y sin borrado físico; no se
                          restauran.
                        </span>
                      </span>
                    </label>
                  </RadioGroup>
                </Field>
              </>
            ) : null}

            <Field variant="outlined" data-invalid={intentado && !motivoValido}>
              <FieldLabel htmlFor="reactivar-motivo">
                Motivo<span data-required-mark="">*</span>
              </FieldLabel>
              <div className="relative">
                <Textarea
                  id="reactivar-motivo"
                  rows={2}
                  maxLength={MOTIVO_MAX}
                  value={motivo}
                  placeholder="Explique qué error se corrige"
                  aria-invalid={intentado && !motivoValido}
                  className={cn(TEXTAREA_OUTLINED, "pr-16")}
                  onChange={(e) => setMotivo(e.target.value)}
                />
                <CharacterCounter value={motivo} max={MOTIVO_MAX} className="absolute top-3 right-3" />
              </div>
              <FieldDescription className={cn(intentado && !motivoValido && "text-red")}>
                Entre {MOTIVO_MIN} y {MOTIVO_MAX} caracteres.
              </FieldDescription>
            </Field>

            <FileUpload
              value={soporte ? [soporte] : []}
              onValueChange={(files) => (files.length ? elegirSoporte(files[0]) : setSoporte(null))}
              accept=".pdf,.jpg,.jpeg,.png"
              maxFiles={1}
              label="Soporte de la reactivación"
            >
              {!soporte && (
                <FileUploadDropzone className="flex-col gap-1 p-4 text-center">
                  <FileUploadOutlinedIcon aria-hidden className="size-5 text-muted-foreground" />
                  <p className="text-sm font-medium">Soporte</p>
                  <p className="text-xs text-muted-foreground">
                    Opcional. 1 archivo PDF, JPG o PNG · máx. {SOPORTE_MAX_MB} MB.
                  </p>
                </FileUploadDropzone>
              )}
              <FileUploadList>
                {soporte && (
                  <FileUploadItem value={soporte}>
                    <FileUploadItemPreview />
                    <FileUploadItemMetadata />
                    <FileUploadItemDelete />
                  </FileUploadItem>
                )}
              </FileUploadList>
            </FileUpload>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={!previa || reactivar.isPending}
            onClick={confirmar}
          >
            {reactivar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <ArrowCounterClockwiseIcon data-icon="inline-start" />
            )}
            Reactivar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
