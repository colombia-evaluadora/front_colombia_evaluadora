import { DatePicker } from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { TrashIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { parseDateValue, formatDateValue } from "@/lib/date-value"

import type { ErroresItem, ItemFila } from "@/features/gestion-estudiantil/citaciones/utils/formularios"
import type { Opcion } from "@/features/gestion-estudiantil/convivencia/api/use-opciones-convivencia"
import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"

interface Props {
  fila: ItemFila
  numero: number
  error?: ErroresItem
  responsables: Opcion[]
  /** Límites del plazo: la Fecha y la Fecha de revisión del compromiso (`yyyy-MM-dd`). */
  desde: string
  hasta: string
  /** Quitar queda deshabilitado con un solo compromiso: el constructor pide al menos uno. */
  puedeQuitar: boolean
  onChange: (patch: Partial<ItemFila>) => void
  onQuitar: () => void
}

/** Un compromiso: descripción (10 a 1000), responsable y plazo entre la fecha y la revisión. */
export function FilaCompromiso({ fila: f, numero, error, responsables, desde, hasta, puedeQuitar, onChange, onQuitar }: Props) {
  const id = `compromiso-${f.key}`
  return (
    <div className="flex items-start gap-2 border-b border-border pb-3 last:border-b-0">
      <span className="flex h-11 w-5 shrink-0 items-center text-sm font-medium">{numero}</span>
      <div className="grid min-w-0 flex-1 grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error?.descripcion) || undefined}>
          <FieldLabel htmlFor={`${id}-descripcion`}>Descripción*</FieldLabel>
          <Input
            id={`${id}-descripcion`}
            maxLength={1000}
            value={f.descripcion}
            aria-invalid={Boolean(error?.descripcion) || undefined}
            onChange={(e) => onChange({ descripcion: e.target.value })}
          />
          {error?.descripcion && <FieldError>{error.descripcion}</FieldError>}
        </Field>
        <ComboOpciones
          id={`${id}-responsable`}
          label="Responsable"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          value={f.responsable}
          options={responsables}
          error={error?.responsable}
          onChange={(responsable) => onChange({ responsable })}
        />
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error?.plazo) || undefined}>
          <FieldLabel htmlFor={`${id}-plazo`}>Plazo*</FieldLabel>
          <DatePicker
            id={`${id}-plazo`}
            minDate={parseDateValue(desde)}
            maxDate={parseDateValue(hasta)}
            value={parseDateValue(f.plazo)}
            aria-invalid={Boolean(error?.plazo) || undefined}
            onChange={(date) => onChange({ plazo: date ? formatDateValue(date) : "" })}
          />
          {error?.plazo && <FieldError>{error.plazo}</FieldError>}
        </Field>
      </div>
      <Button
        type="button"
        variant="ghost"
        color="neutral"
        size="icon-sm"
        className="mt-1.5"
        disabled={!puedeQuitar}
        aria-label={`Quitar el compromiso ${numero}`}
        onClick={onQuitar}
      >
        <TrashIcon />
      </Button>
    </div>
  )
}
