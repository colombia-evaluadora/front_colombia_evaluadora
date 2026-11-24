import { useRef, useState } from "react"

import { MarcoOpciones } from "@/components/marco-opciones"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ArchiveIcon,
  EyeSlashIcon,
  FileUploadOutlinedIcon,
  InfoIcon,
  LockIcon,
  SpinnerIcon,
  WarningIcon,
  XIcon,
} from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input, inputTriggerVariants, inputVariants } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage } from "@/lib/api-client"
import { fileTooLarge, invalidFileType, required } from "@/lib/forms/messages"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { useDisponer } from "@/features/administration/conservacion-datos/api/mutations/conservacion-mutations"
import { ACTA_MAX_BYTES } from "@/features/administration/conservacion-datos/api/schema"
import {
  ALMACENAMIENTO_NO_RESPONDE,
  ARCHIVAR_NO_DISPONIBLE,
  DISPOSICION_LABELS,
  type Disposicion,
  type Vencido,
} from "@/features/administration/conservacion-datos/api/types"

const MOTIVO_MAX = 500

/**
 * Modal Disponer (Sección 6.4): aplica la disposición de la política al lote,
 * con acta en PDF y motivo. Sin almacenamiento de archivo, Archivar queda
 * inactivo y solo se puede anonimizar (S.12.VEN.2).
 */
export function DialogDisponer({
  vencido,
  almacenamientoArchivo,
  onClose,
  onDispuesto,
}: {
  vencido: Vencido
  almacenamientoArchivo: boolean
  onClose: () => void
  /** Tras disponer, en lugar del aviso y cerrar (p. ej. el detalle del lote vuelve a Vencidos). */
  onDispuesto?: () => void
}) {
  const { notify } = useNotify()
  const inputRef = useRef<HTMLInputElement>(null)
  const archivarBloqueado = vencido.disposicion === "ARCHIVAR" && !almacenamientoArchivo
  // Con almacenamiento: la de la política, de solo lectura. Sin él y política
  // Archivar: hay que elegir Anonimizar a conciencia.
  const [disposicion, setDisposicion] = useState<Disposicion | null>(
    archivarBloqueado ? null : vencido.disposicion,
  )
  const [acta, setActa] = useState<File | null>(null)
  const [motivo, setMotivo] = useState("")
  const [intentado, setIntentado] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [errorActa, setErrorActa] = useState<string | null>(null)

  const disponer = useDisponer({
    mutationConfig: {
      onSuccess: () => {
        if (onDispuesto) return onDispuesto()
        notify(SUCCESS_MESSAGES.loteVencido.created)
        onClose()
      },
      onError: (err) => setNotice({ id: Date.now(), message: getErrorMessage(err) }),
    },
  })

  const motivoLimpio = motivo.trim()
  const errores = {
    disposicion: disposicion ? null : "Seleccione la disposición.",
    acta: errorActa ?? (acta ? null : required("El acta", { femenino: true })),
    motivo:
      motivoLimpio.length === 0
        ? required("El motivo")
        : motivoLimpio.length < 10
          ? "El motivo debe tener al menos 10 caracteres."
          : null,
  }

  function elegirActa(file: File | undefined) {
    if (!file) return
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErrorActa(invalidFileType(".pdf"))
      setActa(null)
    } else if (file.size > ACTA_MAX_BYTES) {
      setErrorActa(fileTooLarge(10))
      setActa(null)
    } else {
      setErrorActa(null)
      setActa(file)
    }
  }

  function enviar() {
    setIntentado(true)
    if (errores.disposicion || errores.acta || errores.motivo || !disposicion || !acta) return
    disponer.mutate({
      pkPolitica: vencido.pkPolitica,
      pkEstablecimiento: vencido.pkEstablecimiento,
      disposicion,
      acta,
      motivo: motivoLimpio,
    })
  }

  const accion = disposicion ? DISPOSICION_LABELS[disposicion] : "Disponer"

  return (
    <Dialog open onOpenChange={(open) => !open && !disponer.isPending && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Disponer: {vencido.tipoRegistro} · {vencido.establecimiento} ·{" "}
            {vencido.cantidad.toLocaleString("es-CO")} registros
          </DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />

        <div className="grid gap-5 sm:grid-cols-2">
          {archivarBloqueado ? (
            <MarcoOpciones
              id="disponer-disposicion"
              label="Disposición"
              required
              className="sm:col-span-2"
              error={intentado ? (errores.disposicion ?? undefined) : undefined}
              descripcion={ALMACENAMIENTO_NO_RESPONDE}
            >
              <RadioGroup
                aria-labelledby="disponer-disposicion-label"
                value={disposicion ?? ""}
                onValueChange={(v) => setDisposicion(v as Disposicion)}
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="ANONIMIZAR" />
                  Anonimizar
                </label>
                <Tooltip>
                  <TooltipTrigger
                    render={<label className="flex cursor-not-allowed items-center gap-2 text-sm text-muted-foreground" />}
                  >
                    <RadioGroupItem value="ARCHIVAR" disabled />
                    Archivar
                  </TooltipTrigger>
                  <TooltipContent className="max-w-72">{ALMACENAMIENTO_NO_RESPONDE}</TooltipContent>
                </Tooltip>
              </RadioGroup>
            </MarcoOpciones>
          ) : (
            // Reglas de UI: campo de solo lectura con label flotante y candado (como en Criterios de prioridad).
            <Field variant="outlined" data-disabled>
              <FieldLabel htmlFor="disponer-disposicion">
                Disposición<span data-required-mark="">*</span>
              </FieldLabel>
              <div className="relative">
                <Input
                  id="disponer-disposicion"
                  value={DISPOSICION_LABELS[vencido.disposicion]}
                  disabled
                  readOnly
                  className="pr-9"
                />
                <LockIcon aria-hidden className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <FieldDescription>La de la política.</FieldDescription>
            </Field>
          )}

          {/* Carga del acta como un campo más: label flotante sobre el borde, 40 px, ícono de carga a la derecha. */}
          <Field variant="outlined" data-invalid={(intentado || errorActa) && errores.acta ? true : undefined}>
            <FieldLabel htmlFor="disponer-acta">
              Acta<span data-required-mark="">*</span>
            </FieldLabel>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              // `hidden` y no `sr-only`: absoluto, se salía por la derecha y le ponía scroll horizontal al modal.
              className="hidden"
              tabIndex={-1}
              onChange={(e) => {
                elegirActa(e.target.files?.[0])
                e.target.value = ""
              }}
            />
            <button
              type="button"
              id="disponer-acta"
              aria-invalid={(intentado || errorActa) && errores.acta ? true : undefined}
              className={cn(
                inputVariants({ variant: "outlined" }),
                inputTriggerVariants({ variant: "outlined" }),
                "flex items-center gap-2 text-left",
                !acta && "text-muted-foreground",
              )}
              onClick={() => inputRef.current?.click()}
            >
              <span className="min-w-0 flex-1 truncate">{acta ? acta.name : "Cargar PDF"}</span>
              <FileUploadOutlinedIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </button>
            {(intentado || errorActa) && errores.acta ? (
              <FieldError>{errores.acta}</FieldError>
            ) : (
              <FieldDescription>Solo PDF, hasta 10 MB.</FieldDescription>
            )}
          </Field>

          <Field
            variant="outlined"
            className={archivarBloqueado ? "" : "sm:col-span-2"}
            data-invalid={intentado && errores.motivo ? true : undefined}
          >
            <FieldLabel htmlFor="disponer-motivo">
              Motivo<span data-required-mark="">*</span>
            </FieldLabel>
            <Textarea
              id="disponer-motivo"
              rows={3}
              maxLength={MOTIVO_MAX}
              value={motivo}
              className={TEXTAREA_OUTLINED}
              aria-invalid={intentado && errores.motivo ? true : undefined}
              placeholder="Ej. Mensajes de 2024 que cumplieron su plazo de 2 años."
              onChange={(e) => setMotivo(e.target.value)}
            />
            <span className="flex justify-between gap-2">
              {intentado && errores.motivo ? <FieldError>{errores.motivo}</FieldError> : <span />}
              <CharacterCounter value={motivo} max={MOTIVO_MAX} />
            </span>
          </Field>
        </div>

        {archivarBloqueado ? (
          <Alert variant="warning">
            <WarningIcon />
            <AlertDescription>{ARCHIVAR_NO_DISPONIBLE}</AlertDescription>
          </Alert>
        ) : (
          <Alert variant="info">
            <InfoIcon />
            <AlertDescription>
              {vencido.disposicion === "ARCHIVAR"
                ? "Los registros se guardarán en un archivo de solo lectura y se eliminarán de la plataforma solo si el archivo se verifica. Lo archivado no se restaura."
                : "Los datos personales de estos registros se reemplazarán de forma irreversible. Los datos no personales se conservan para estadística."}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="sm:items-center">
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          <Button variant="outline" color="neutral" size="sm" disabled={disponer.isPending} onClick={onClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            size="sm"
            color="primary"
            disabled={disponer.isPending || (archivarBloqueado && !disposicion)}
            onClick={enviar}
          >
            {disponer.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : disposicion === "ANONIMIZAR" ? (
              <EyeSlashIcon data-icon="inline-start" />
            ) : (
              <ArchiveIcon data-icon="inline-start" />
            )}
            {accion}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
