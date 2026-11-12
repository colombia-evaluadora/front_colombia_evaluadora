import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
import { ArrowRightIcon, FileUploadOutlinedIcon, FloppyDiskIcon, InfoIcon, LockIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import { useCorregirNotaHomologada } from "@/features/coverage/matricula/api/mutations/corregir-nota-homologada"
import type { EscalaValoracion, NotaHomologada } from "@/features/coverage/matricula/api/types/notas-homologadas"
import {
  formatNota,
  parseNota,
  valoracionEnEscala,
} from "@/features/coverage/matricula/components/notas-homologadas/nota-format"

const SOPORTE_EXTENSIONES = ["pdf", "jpg", "jpeg", "png"]
const SOPORTE_MAX_MB = 10
const MOTIVO_MIN = 10
const MOTIVO_MAX = 500

interface Props {
  matriculaId: string
  nota: NotaHomologada
  escala: EscalaValoracion
  /** «Ana Sofía Pérez Gómez · 6°C · Sede 2 · Tarde» */
  contexto: string
  /** Marca de la nota tal como sale en la tabla («Homologada — grupo 6°A»). */
  marca: string
  onOpenChange: (open: boolean) => void
  onCorrected: () => void
}

/**
 * Corregir nota homologada (C.1.DET): crea una versión nueva de la definitiva y
 * conserva la original; las notas del grupo de origen no cambian.
 * Motivo y soporte obligatorios, igual que corregir datos de identidad.
 */
export function DialogCorregirNota({ matriculaId, nota, escala, contexto, marca, onOpenChange, onCorrected }: Props) {
  const [texto, setTexto] = useState("")
  const [motivo, setMotivo] = useState("")
  const [soporte, setSoporte] = useState<File | null>(null)
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const corregir = useCorregirNotaHomologada()

  const actual = nota.nota ?? 0
  const nueva = parseNota(texto)
  const enEscala = !Number.isNaN(nueva) && nueva >= escala.min && nueva <= escala.max
  const notaValida = enEscala && Math.round(nueva * 10) === nueva * 10 && nueva !== actual
  const motivoValido = motivo.trim().length >= MOTIVO_MIN && motivo.trim().length <= MOTIVO_MAX
  const ayudaNota = !texto.trim()
    ? `Escala ${formatNota(escala.min)} a ${formatNota(escala.max)}`
    : !enEscala
      ? `Debe estar entre ${formatNota(escala.min)} y ${formatNota(escala.max)}`
      : nueva === actual
        ? "Es igual a la nota actual"
        : Math.round(nueva * 10) !== nueva * 10
          ? "Use un solo decimal"
          : `Escala ${formatNota(escala.min)} a ${formatNota(escala.max)} · Valoración: ${valoracionEnEscala(nueva, escala)}`

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

  function guardar() {
    setIntentado(true)
    if (!notaValida || !motivoValido || !soporte) return
    corregir.mutate(
      { matriculaId, notaId: nota.id, nota: nueva, reason: motivo, support: soporte },
      { onSuccess: onCorrected, onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }) },
    )
  }

  return (
    <Dialog open onOpenChange={(next) => !corregir.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Corregir nota homologada — {nota.asignatura} · {nota.periodo}
          </DialogTitle>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {contexto}
            <Badge variant="soft" color="primary">
              {marca}
            </Badge>
          </p>
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nota-original" className="text-sm font-medium">
              Nota original
            </label>
            <div className="relative">
              <Input id="nota-original" size="sm" variant="outlined" disabled value={`${formatNota(actual)} · ${nota.valoracion ?? ""}`} />
              <LockIcon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            </div>
          </div>
          <ArrowRightIcon className="mt-9 size-4 text-muted-foreground" aria-hidden />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nota-corregida" className="text-sm font-medium">
              <span className="text-red">*</span> Nota corregida
            </label>
            <Input
              id="nota-corregida"
              size="sm"
              variant="outlined"
              inputMode="decimal"
              maxLength={4}
              value={texto}
              aria-invalid={intentado && !notaValida}
              aria-describedby="nota-corregida-ayuda"
              onChange={(e) => setTexto(e.target.value.replace(/[^\d.,]/g, ""))}
            />
            <span
              id="nota-corregida-ayuda"
              className={cn("text-xs text-muted-foreground", intentado && !notaValida && "text-red")}
            >
              {ayudaNota}
            </span>
          </div>
        </div>

        <Field variant="outlined" data-invalid={intentado && !motivoValido}>
          <FieldLabel htmlFor="nota-motivo">Motivo*</FieldLabel>
          <div className="relative">
            <Textarea
              id="nota-motivo"
              rows={2}
              maxLength={MOTIVO_MAX}
              value={motivo}
              placeholder="Agregar"
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
          invalid={intentado && !soporte}
          label="Soporte de la corrección"
        >
          {!soporte && (
            <FileUploadDropzone className={cn("flex-col gap-1 p-4 text-center", intentado && "border-red")}>
              <FileUploadOutlinedIcon aria-hidden className="size-5 text-muted-foreground" />
              <p className="text-sm font-medium">Soporte *</p>
              <p className="text-xs text-muted-foreground">1 archivo PDF, JPG o PNG · máx. {SOPORTE_MAX_MB} MB.</p>
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
        {intentado && !soporte && <p className="-mt-2 text-xs text-red">Adjunte el soporte de la corrección.</p>}

        <div className="flex gap-3 rounded-md border border-primary/30 bg-primary-22 p-4 text-sm">
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="font-medium">Se crea una nueva versión de la nota y se conserva la original.</p>
            <p className="text-muted-foreground">
              La nota se mostrará como Homologada (corregida). Las notas del grupo de origen no cambian.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="button" variant="fill" color="primary" size="sm" disabled={corregir.isPending} onClick={guardar}>
            {corregir.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FloppyDiskIcon data-icon="inline-start" />
            )}
            Guardar corrección
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
