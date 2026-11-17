import { DatePicker } from "@/components/date-picker"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { parseDateValue } from "@/lib/date-value"

import type { BaseFechaSiuce } from "@/features/gestion-estudiantil/convivencia/api/comite-types"

interface Props {
  base: BaseFechaSiuce
  onBase: (b: BaseFechaSiuce) => void
  desde: string
  hasta: string
  onDesde: (d: Date | undefined) => void
  onHasta: (d: Date | undefined) => void
  soloPendientes: boolean
  onSoloPendientes: (v: boolean) => void
  errorRango?: string
}

/** Base de fecha, rango obligatorio y casilla de pendientes de reporte. */
export function CamposRangoSiuce({ base, onBase, desde, hasta, onDesde, onHasta, soloPendientes, onSoloPendientes, errorRango }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Field orientation="vertical" variant="outlined" className="gap-2" role="group" aria-labelledby="siuce-base-label">
        <FieldLabel id="siuce-base-label">Base de fecha*</FieldLabel>
        <RadioGroup
          aria-labelledby="siuce-base-label"
          className="flex h-10 flex-row items-center gap-6 pr-3 pl-3.5"
          value={base}
          onValueChange={(v) => onBase(v as BaseFechaSiuce)}
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="HECHOS" />
            Fecha de los hechos
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="CONOCIMIENTO" />
            Fecha de conocimiento
          </label>
        </RadioGroup>
      </Field>
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errorRango) || undefined}>
          <FieldLabel htmlFor="siuce-desde">Desde*</FieldLabel>
          <DatePicker id="siuce-desde" value={parseDateValue(desde)} onChange={onDesde} aria-invalid={Boolean(errorRango)} />
        </Field>
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errorRango) || undefined}>
          <FieldLabel htmlFor="siuce-hasta">Hasta*</FieldLabel>
          <DatePicker
            id="siuce-hasta"
            value={parseDateValue(hasta)}
            minDate={desde ? parseDateValue(desde) : undefined}
            onChange={onHasta}
            aria-invalid={Boolean(errorRango)}
          />
        </Field>
        {errorRango && <FieldError className="sm:col-span-2">{errorRango}</FieldError>}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={soloPendientes} onCheckedChange={(v) => onSoloPendientes(Boolean(v))} />
        Con afectados pendientes de reporte
      </label>
    </div>
  )
}
