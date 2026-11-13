import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"

import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { CharacterCounter } from "@/components/ui/character-counter"
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "@/components/ui/file-upload"
import { ArrowCounterClockwiseIcon, FileUploadOutlinedIcon, SpinnerIcon, WarningIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import { useReactivarLote } from "@/features/coverage/matricula/api/acciones-lote"
import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"
import {
  Aviso,
  MatriculasAfectadas,
  mensajeLote,
  plural,
  tituloAccion,
} from "@/features/coverage/matricula/components/dialogs/acciones/compartido"

const MOTIVO_MIN = 10
const MOTIVO_MAX = 500
const SOPORTE_MAX_MB = 10

/**
 * Reactivar por lote (C.1.LOT.6, Regla 15): solo Aprobadas (sin Promovido con
 * áreas pendientes) o Reprobadas, con el período Abierto y sin matrícula en el
 * período siguiente. Un motivo y un soporte opcional para todas; las Promovidas
 * y Reubicadas se reactivan una por una. Las que no cumplan se informan al final.
 */
export function DialogReactivarLote({
  matriculas,
  onOpenChange,
  onDone,
}: {
  matriculas: Matricula[]
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}) {
  const { notify } = useNotify()
  const reactivar = useReactivarLote()
  const [motivo, setMotivo] = useState("")
  const [soporte, setSoporte] = useState<File | null>(null)

  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const motivoValido = motivo.trim().length >= MOTIVO_MIN && motivo.trim().length <= MOTIVO_MAX

  function confirmar() {
    setIntentado(true)
    if (!motivoValido) return
    reactivar.mutate(
      { matriculaIds: matriculas.map((m) => m.id), motivo: motivo.trim(), soporte },
      {
        onSuccess: (resultados) => {
          const { variant, texto } = mensajeLote(resultados, (n) => `${plural(n, "matrícula volvió", "matrículas volvieron")} a Cursando.`)
          notify(texto, { variant })
          onDone?.()
          onOpenChange(false)
        },
        onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !reactivar.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <WarningIcon className="size-6 shrink-0 text-yellow" aria-hidden />
            <DialogTitle>{tituloAccion("Reactivar", matriculas)}</DialogTitle>
          </div>
          <MatriculasAfectadas matriculas={matriculas} />
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        <Aviso tono="advertencia" titulo="Volverán a Cursando.">
          Al corregir sus notas se vuelve a ejecutar su cierre académico y se reajusta su reserva. Sus matrículas
          complementarias también vuelven a Cursando.
        </Aviso>


        <Field variant="outlined" className="gap-1.5" data-invalid={(intentado && !motivoValido) || undefined}>
          <FieldLabel htmlFor="reactivar-lote-motivo">
            Motivo<span data-required-mark="">*</span>
          </FieldLabel>
          <div className="relative">
            <Textarea
              id="reactivar-lote-motivo"
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
          onValueChange={(files) => {
            const f = files[0]
            if (!f) return setSoporte(null)
            if (f.size > SOPORTE_MAX_MB * 1024 * 1024)
              return setError({ id: Date.now(), message: `El soporte supera los ${SOPORTE_MAX_MB} MB.` })
            setSoporte(f)
          }}
          accept=".pdf,.jpg,.jpeg,.png"
          maxFiles={1}
          label="Soporte de la reactivación"
        >
          {!soporte && (
            <FileUploadDropzone className="flex-col gap-1 p-4 text-center">
              <FileUploadOutlinedIcon aria-hidden className="size-5 text-muted-foreground" />
              <p className="text-sm font-medium">Soporte</p>
              <p className="text-xs text-muted-foreground">Opcional. 1 archivo PDF, JPG o PNG · máx. {SOPORTE_MAX_MB} MB.</p>
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
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="fill" color="primary" size="sm" disabled={reactivar.isPending} onClick={confirmar}>
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
