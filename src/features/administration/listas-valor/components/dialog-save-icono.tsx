import { useEffect, useRef, useState } from "react"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon, ImageIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { getErrorMessage } from "@/lib/api-client"
import { minLength, required } from "@/lib/forms/messages"
import { cn } from "@/lib/utils"

import { useSaveIcono } from "@/features/administration/listas-valor/api/mutations/iconos"
import {
  ICONO_NOMBRE_MAX,
  ICONO_NOMBRE_MIN,
  type Icono,
} from "@/features/administration/listas-valor/api/types/icono"
import {
  IconoGuardado,
  IconoImagen,
} from "@/features/administration/listas-valor/components/icono-imagen"
import { EstadoField } from "@/features/administration/listas-valor/components/estado-field"
import { validarArchivoIcono } from "@/features/administration/listas-valor/lib/imagen-icono"

interface DialogSaveIconoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Presente = modificar. */
  icono?: Icono | null
}

/** Modal Nuevo ícono / Modificar ícono (Administración §2.3). */
export function DialogSaveIcono({ open, onOpenChange, icono }: DialogSaveIconoProps) {
  const isEditing = icono != null
  const { notify } = useNotify()
  const inputRef = useRef<HTMLInputElement>(null)
  const [nombre, setNombre] = useState(icono?.nombre ?? "")
  // null = sin archivo nuevo (al modificar, conserva la imagen).
  const [imagen, setImagen] = useState<File | null>(null)
  const [previa, setPrevia] = useState<string | null>(null)
  const previaSvg = imagen?.name.toLowerCase().endsWith(".svg") ?? false
  const [errorImagen, setErrorImagen] = useState<string | null>(null)
  const [habilitado, setHabilitado] = useState(icono?.habilitado ?? true)
  const [arrastrando, setArrastrando] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const save = useSaveIcono()

  const nombreLimpio = nombre.trim()
  const errorNombre = !submitted
    ? undefined
    : !nombreLimpio
      ? required("El nombre")
      : nombreLimpio.length < ICONO_NOMBRE_MIN
        ? minLength(ICONO_NOMBRE_MIN, "El nombre")
        : undefined
  const faltaImagen = submitted && !isEditing && imagen == null && !errorImagen
  const hayImagen = previa != null || icono != null
  const dirty =
    nombre !== (icono?.nombre ?? "") ||
    imagen != null ||
    habilitado !== (icono?.habilitado ?? true)

  // El object URL de la vista previa se libera al cambiarlo o al cerrar.
  useEffect(() => () => {
    if (previa) URL.revokeObjectURL(previa)
  }, [previa])

  async function cargar(file: File | undefined) {
    if (!file) return
    const error = await validarArchivoIcono(file)
    setErrorImagen(error)
    setImagen(error ? null : file)
    setPrevia(error ? null : URL.createObjectURL(file))
  }

  function requestClose() {
    if (save.isPending) return
    if (dirty) setConfirmDiscardOpen(true)
    else onOpenChange(false)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!nombreLimpio || nombreLimpio.length < ICONO_NOMBRE_MIN || errorImagen) return
    if (!isEditing && imagen == null) return
    try {
      await save.mutateAsync({ id: icono?.pkIcono, nombre: nombreLimpio, imagen, habilitado })
      onOpenChange(false)
      notify("Ícono guardado.")
    } catch (error) {
      setNotice({ id: Date.now(), message: getErrorMessage(error) })
    }
  }

  const formId = `icono-form-${icono?.pkIcono ?? "nuevo"}`

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
      <DialogContent className="sm:max-w-md" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modificar ícono" : "Nuevo ícono"}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field variant="outlined" data-invalid={errorNombre ? "true" : undefined}>
            <FieldLabel htmlFor={`${formId}-nombre`}>Nombre*</FieldLabel>
            <div className="relative">
              <Input
                id={`${formId}-nombre`}
                placeholder="Ej. Hexágono"
                maxLength={ICONO_NOMBRE_MAX}
                className="pr-16"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                aria-invalid={Boolean(errorNombre)}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground tabular-nums">
                {nombre.length} / {ICONO_NOMBRE_MAX}
              </span>
            </div>
            <FieldError>{errorNombre}</FieldError>
          </Field>

          <Field data-invalid={errorImagen || faltaImagen ? "true" : undefined}>
            <FieldLabel htmlFor={`${formId}-imagen`}>
              <span className="text-red">*</span> Imagen
            </FieldLabel>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setArrastrando(true)
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(e) => {
                e.preventDefault()
                setArrastrando(false)
                void cargar(e.dataTransfer.files[0])
              }}
              className={cn(
                "flex min-h-28 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-muted/30 px-4 py-5 text-center outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40",
                arrastrando && "border-primary bg-primary/5",
                (errorImagen || faltaImagen) && "border-red-stroke",
              )}
            >
              {previa ? (
                <IconoImagen src={previa} esSvg={previaSvg} nombre={nombreLimpio} className="size-10 text-foreground" />
              ) : icono ? (
                <IconoGuardado icono={icono} className="size-10 text-foreground" />
              ) : (
                <ImageIcon aria-hidden className="size-6 text-foreground" />
              )}
              <span className="text-sm">
                {hayImagen ? "Arrastre o haga clic para reemplazar" : "Arrastre o haga clic para cargar"}
              </span>
              <span className="text-xs text-muted-foreground">
                SVG o PNG, cuadrada, máx. 100 KB
              </span>
            </button>
            <p className="text-xs text-muted-foreground">
              Aquí se ve con los colores del archivo. Al usarlo en una valoración, el SVG toma el color de la escala; el PNG conserva los suyos.
            </p>
            <input
              ref={inputRef}
              id={`${formId}-imagen`}
              type="file"
              accept=".svg,.png,image/svg+xml,image/png"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                void cargar(e.target.files?.[0])
                e.target.value = ""
              }}
            />
            <FieldError>{errorImagen ?? (faltaImagen ? required("La imagen", { femenino: true }) : undefined)}</FieldError>
          </Field>

          <EstadoField
            id={`${formId}-estado`}
            de="icono"
            checked={habilitado}
            onChange={setHabilitado}
          />
        </form>
        <DialogFooter className="sm:items-center">
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          <Button size="sm" type="button" variant="outline" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            size="sm"
            type="submit"
            color="primary"
            form={formId}
            disabled={save.isPending}
            aria-busy={save.isPending}
          >
            {save.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FloppyDiskIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onOpenChange(false)
        }}
      />
    </Dialog>
  )
}
