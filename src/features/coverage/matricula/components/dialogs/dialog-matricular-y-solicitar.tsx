import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FieldDescription, FieldError } from "@/components/ui/field"
import { PaperclipIcon, SpinnerIcon, UploadSimpleIcon, XIcon } from "@/components/ui/icons"

const EVIDENCIA_MAX_MB = 10
const TIPOS = /\.(pdf|jpe?g|png)$/i

interface DialogMatricularYSolicitarProps {
  nombre: string
  /** Establecimiento donde sigue Cursando. */
  institucion: string
  saving: boolean
  onCancel: () => void
  onConfirm: (evidencia: File) => void
}

/**
 * SOL.1: el estudiante sigue Cursando en otro establecimiento. La matrícula
 * aquí se crea igual y se pide el retiro allá, con evidencia obligatoria.
 */
export function DialogMatricularYSolicitar({
  nombre,
  institucion,
  saving,
  onCancel,
  onConfirm,
}: DialogMatricularYSolicitarProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [evidencia, setEvidencia] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [intentado, setIntentado] = useState(false)

  function elegir(file: File | undefined) {
    if (!file) return
    if (!TIPOS.test(file.name)) return setError("La evidencia debe ser PDF, JPG o PNG.")
    if (file.size > EVIDENCIA_MAX_MB * 1024 * 1024) return setError(`La evidencia supera los ${EVIDENCIA_MAX_MB} MB.`)
    setError(null)
    setEvidencia(file)
  }

  function confirmar() {
    setIntentado(true)
    if (evidencia) onConfirm(evidencia)
  }

  const mensajeError = error ?? (intentado && !evidencia ? "Adjunte la evidencia." : null)

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar estudiante › Matrícula</DialogTitle>
          <DialogDescription>
            {nombre} sigue Cursando en {institucion}. Se pedirá su retiro allá; la matrícula aquí se crea igual.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-start gap-1.5">
          <span id="solicitud-evidencia-label" className="text-sm">
            Evidencia <span className="text-red">*</span>
          </span>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
            aria-labelledby="solicitud-evidencia-label"
            onChange={(e) => {
              elegir(e.target.files?.[0])
              e.target.value = ""
            }}
          />
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => fileInput.current?.click()}>
            <UploadSimpleIcon data-icon="inline-start" />
            Subir PDF, JPG o PNG
          </Button>
          {evidencia ? (
            <span className="inline-flex items-center gap-2 text-sm">
              <PaperclipIcon className="size-4 text-muted-foreground" aria-hidden />
              {evidencia.name}
              <button
                type="button"
                aria-label={`Quitar ${evidencia.name}`}
                className="rounded-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                onClick={() => setEvidencia(null)}
              >
                <XIcon className="size-4" />
              </button>
            </span>
          ) : null}
          {mensajeError ? (
            <FieldError>{mensajeError}</FieldError>
          ) : (
            <FieldDescription>
              Soporte del traslado (p. ej. certificado o carta del acudiente). PDF, JPG o PNG · máx. {EVIDENCIA_MAX_MB} MB.
            </FieldDescription>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" color="neutral" type="button" size="sm" disabled={saving} onClick={onCancel}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="button" variant="fill" color="primary" size="sm" disabled={saving} aria-busy={saving} onClick={confirmar}>
            {saving ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : null}
            Matricular y solicitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
