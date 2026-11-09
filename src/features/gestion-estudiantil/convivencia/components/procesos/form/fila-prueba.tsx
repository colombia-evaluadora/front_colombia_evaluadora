import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"

import { SoportesUpload } from "@/features/gestion-estudiantil/convivencia/components/soportes-upload"
import type { PruebaFila } from "@/features/gestion-estudiantil/convivencia/utils/proceso-form"

interface Props {
  fila: PruebaFila
  numero: number
  error?: string
  onChange: (patch: Partial<PruebaFila>) => void
  onQuitar: () => void
}

/** Una prueba: descripción (5 a 300) y un archivo opcional (PDF, JPG o PNG, 10 MB), subido al guardar. */
export function FilaPrueba({ fila: p, numero, error, onChange, onQuitar }: Props) {
  const id = `prueba-${p.key}`
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
          <FieldLabel htmlFor={`${id}-descripcion`}>Descripción de la prueba {numero}*</FieldLabel>
          <Input
            id={`${id}-descripcion`}
            maxLength={300}
            placeholder="P. ej. Testimonio del Responsable de enseñanza de turno"
            value={p.descripcion}
            aria-invalid={Boolean(error) || undefined}
            onChange={(e) => onChange({ descripcion: e.target.value })}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
        <SoportesUpload
          label="Archivo de la prueba (opcional)"
          max={1}
          archivos={p.archivo ? [p.archivo] : []}
          onChange={(archivos) => onChange({ archivo: archivos[0] ?? null })}
        />
      </div>
      <Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={`Quitar la prueba ${numero}`} onClick={onQuitar}>
        <XIcon />
      </Button>
    </div>
  )
}
