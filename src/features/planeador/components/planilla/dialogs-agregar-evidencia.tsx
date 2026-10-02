import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { FileUpload, FileUploadDropzone } from "@/components/ui/file-upload"
import { FileTextIcon, ImageIcon, WarningCircleIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import {
  OBSERVACION_EVIDENCIA_ACCEPT,
  OBSERVACION_EVIDENCIA_MAX_MB,
  OBSERVACION_EVIDENCIA_TIPOS_LABEL,
  esEvidenciaImagen,
  validarEvidencia,
} from "@/features/planeador/lib/observacion"

export const ENLACE_VALIDO = /^https?:\/\/\S+$/i

/** Regla 61: el enlace es una imagen (Imgur, Discord…); si no carga se muestra el enlace. */
export function EnlaceImagen({
  url,
  className = "max-h-40",
  onError,
}: {
  url: string
  className?: string
  onError?: () => void
}) {
  const [fallo, setFallo] = useState(false)
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block w-fit rounded-md">
      {fallo ? (
        <span className="text-xs break-all text-primary underline">{url}</span>
      ) : (
        <img
          src={url}
          alt="Evidencia enlazada"
          referrerPolicy="no-referrer"
          className={`${className} rounded-md border object-contain`}
          onError={() => {
            setFallo(true)
            onError?.()
          }}
        />
      )}
    </a>
  )
}

interface DialogSubirEvidenciaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cantidadActual: number
  subiendo?: boolean
  onSubir: (archivo: File) => void
}

/** Arrastrar o elegir un archivo de evidencia; se sube al confirmar. */
export function DialogSubirEvidencia({
  open,
  onOpenChange,
  cantidadActual,
  subiendo,
  onSubir,
}: DialogSubirEvidenciaProps) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setArchivo(null)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!archivo || !esEvidenciaImagen(archivo.name)) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(archivo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [archivo])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Subir evidencia</DialogTitle>
          <DialogDescription>
            {OBSERVACION_EVIDENCIA_TIPOS_LABEL} de máximo {OBSERVACION_EVIDENCIA_MAX_MB} MB.
          </DialogDescription>
        </DialogHeader>

        <FileUpload
          value={archivo ? [archivo] : []}
          onValueChange={(files) => {
            setArchivo(files[0] ?? null)
            setError(null)
          }}
          accept={OBSERVACION_EVIDENCIA_ACCEPT}
          maxFiles={1}
          onFileValidate={(file) => validarEvidencia(file, cantidadActual)}
          onFileReject={(_file, motivo) => setError(motivo)}
          invalid={Boolean(error)}
        >
          <FileUploadDropzone className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-lg p-4 text-center">
            {archivo ? (
              preview ? (
                <img src={preview} alt={archivo.name} className="max-h-40 rounded-md object-contain" />
              ) : (
                <>
                  <FileTextIcon className="size-8 text-muted-foreground" />
                  <p className="text-xs font-medium break-all">{archivo.name}</p>
                </>
              )
            ) : (
              <>
                <ImageIcon className="size-8 text-muted-foreground" />
                <p className="text-xs font-semibold">
                  Arrastra y suelta o <span className="text-primary">haz clic aquí</span>
                </p>
              </>
            )}
          </FileUploadDropzone>
        </FileUpload>
        {error && (
          <p role="alert" className="flex items-start gap-1.5 text-xs text-red">
            <WarningCircleIcon className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </p>
        )}

        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button size="sm" type="button" variant="ghost" />}>Cancelar</DialogClose>
          <Button
            size="sm"
            type="button"
            color="primary"
            disabled={!archivo || subiendo}
            onClick={() => archivo && onSubir(archivo)}
          >
            Subir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DialogEnlaceEvidenciaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inicial: string
  onConfirmar: (url: string) => void
}

/** Imagen por enlace (Imgur, Discord…) con vista previa en vivo. */
export function DialogEnlaceEvidencia({ open, onOpenChange, inicial, onConfirmar }: DialogEnlaceEvidenciaProps) {
  const [url, setUrl] = useState(inicial)
  const [noCarga, setNoCarga] = useState(false)

  useEffect(() => {
    if (open) setUrl(inicial)
  }, [open, inicial])

  const limpio = url.trim()
  const valido = ENLACE_VALIDO.test(limpio)

  useEffect(() => {
    setNoCarga(false)
  }, [limpio])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Imagen por enlace</DialogTitle>
          <DialogDescription>Pega el enlace directo a la imagen (Imgur, Discord…).</DialogDescription>
        </DialogHeader>

        <Field variant="outlined">
          <FieldLabel htmlFor="enlace-evidencia">Enlace</FieldLabel>
          <Input
            id="enlace-evidencia"
            type="url"
            inputMode="url"
            value={url}
            maxLength={1000}
            aria-invalid={(limpio !== "" && !valido) || undefined}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://i.imgur.com/…"
          />
          {limpio !== "" && !valido && (
            <p role="alert" className="text-destructive text-xs">
              El enlace debe empezar por http:// o https://
            </p>
          )}
        </Field>

        {valido && (
          <div className="flex flex-col gap-1.5">
            <EnlaceImagen key={limpio} url={limpio} onError={() => setNoCarga(true)} />
            {noCarga && (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <WarningCircleIcon className="mt-0.5 size-3.5 shrink-0" />
                No parece un enlace directo a la imagen. En Imgur usa el de i.imgur.com.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button size="sm" type="button" variant="ghost" />}>Cancelar</DialogClose>
          <Button size="sm" type="button" color="primary" disabled={!valido} onClick={() => onConfirmar(limpio)}>
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
