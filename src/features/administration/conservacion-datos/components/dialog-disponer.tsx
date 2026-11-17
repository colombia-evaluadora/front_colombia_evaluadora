import { useRef, useState } from "react"

import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ArchiveIcon,
  FileUploadOutlinedIcon,
  InfoIcon,
  LockIcon,
  SpinnerIcon,
  WarningIcon,
  XIcon,
} from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage } from "@/lib/api-client"
import { fileTooLarge, invalidFileType, required } from "@/lib/forms/messages"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { useDisponer } from "@/features/administration/conservacion-datos/api/mutations/conservacion-mutations"
import { ACTA_MAX_BYTES } from "@/features/administration/conservacion-datos/api/schema"
import {
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
}: {
  vencido: Vencido
  almacenamientoArchivo: boolean
  onClose: () => void
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
        notify(SUCCESS_MESSAGES.loteVencido.created)
        onClose()
      },
      onError: (err) => setNotice({ id: Date.now(), message: getErrorMessage(err) }),
    },
  })

  const motivoLimpio = motivo.trim()
  const errores = {
    disposicion: disposicion ? null : "Seleccione la disposición.",
    acta: errorActa ?? (acta ? null : required("El acta")),
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Disponer: {vencido.tipoRegistro} · {vencido.establecimiento} ·{" "}
            {vencido.cantidad.toLocaleString("es-CO")} registros
          </DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />

        <div className="grid gap-5 sm:grid-cols-2">
          {archivarBloqueado ? (
            <fieldset className="flex flex-col gap-1.5 sm:col-span-2">
              <legend className="mb-1.5 text-sm">
                Disposición<span className="text-red"> *</span>
              </legend>
              <RadioGroup
                className="flex gap-6"
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
                  <TooltipContent className="max-w-72">{ARCHIVAR_NO_DISPONIBLE}</TooltipContent>
                </Tooltip>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                La política indica Archivar, pero el almacenamiento del archivo histórico no está configurado.
              </p>
              {intentado && errores.disposicion ? <p className="text-xs text-red">{errores.disposicion}</p> : null}
            </fieldset>
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm">Disposición</span>
              <div className="flex h-10 items-center justify-between rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                {DISPOSICION_LABELS[vencido.disposicion]}
                <LockIcon className="size-4" aria-hidden />
              </div>
              <p className="text-xs text-muted-foreground">La de la política.</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-sm">
              Acta<span className="text-red"> *</span>
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                elegirActa(e.target.files?.[0])
                e.target.value = ""
              }}
            />
            <Button
              type="button"
              variant="outline"
              color="neutral"
              className="justify-start overflow-hidden"
              aria-invalid={intentado && errores.acta ? true : undefined}
              onClick={() => inputRef.current?.click()}
            >
              <FileUploadOutlinedIcon data-icon="inline-start" />
              <span className="truncate">{acta ? acta.name : "Cargar acta"}</span>
            </Button>
            {(intentado || errorActa) && errores.acta ? (
              <p className="text-xs text-red">{errores.acta}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Solo PDF, hasta 10 MB.</p>
            )}
          </div>

          <Field
            variant="outlined"
            className={archivarBloqueado ? "" : "sm:col-span-2"}
            data-invalid={intentado && errores.motivo ? true : undefined}
          >
            <FieldLabel htmlFor="disponer-motivo">
              Motivo<span className="text-red"> *</span>
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

        <DialogFooter>
          <Button size="sm" variant="outline" color="neutral" disabled={disponer.isPending} onClick={onClose}>
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
