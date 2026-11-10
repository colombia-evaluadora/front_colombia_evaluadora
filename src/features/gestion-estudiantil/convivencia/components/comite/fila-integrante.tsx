import { DatePicker } from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { CampoPersona } from "@/features/gestion-estudiantil/convivencia/components/comite/campo-persona"
import type { ErrorFilaIntegrante, FilaIntegrante } from "@/features/gestion-estudiantil/convivencia/utils/comite"

interface Props {
  fila: FilaIntegrante
  periodo: number | null
  error?: ErrorFilaIntegrante
  /** Hasta solo se fija al crear el Comité; después, quien se retira se reemplaza. */
  hastaEditable: boolean
  inicioPeriodo: string
  finPeriodo: string
  /** Cargos que puede tomar una fila agregada; las demás ya traen el suyo. */
  opcionesCargo: { value: string; label: string }[]
  onCargo: (valor: string) => void
  bloqueada: boolean
  puedeEscribir: boolean
  onChange: (patch: Partial<FilaIntegrante>) => void
  onQuitar: () => void
}

/** Una fila del constructor por cargo: Cargo, persona según su dato, Desde, Hasta («Vigente» si vacío) y Quitar. */
export function FilaIntegranteForm({ fila, periodo, error, hastaEditable, inicioPeriodo, finPeriodo, opcionesCargo, onCargo, bloqueada, puedeEscribir, onChange, onQuitar }: Props) {
  const guardada = fila.id != null
  const sinCargoFijo = !guardada && !bloqueada
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border p-3">
      <div className="grid min-w-0 flex-1 grid-cols-1 items-start gap-3 sm:grid-cols-[3fr_3fr_2fr_2fr]">
        {sinCargoFijo ? (
          <ComboOpciones
            id={`int-cargo-${fila.key}`}
            label="Cargo"
            required
            size="default"
            todos={false}
            value={fila.fk_tlv_cargo}
            options={opcionesCargo}
            error={error?.cargo}
            onChange={onCargo}
          />
        ) : (
          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error?.cargo) || undefined}>
            <FieldLabel htmlFor={`int-cargo-${fila.key}`}>Cargo*</FieldLabel>
            <Input id={`int-cargo-${fila.key}`} readOnly title={fila.cargo_nombre} value={fila.cargo_nombre} />
            {error?.cargo && <FieldError>{error.cargo}</FieldError>}
          </Field>
        )}
        {guardada ? (
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor={`int-persona-${fila.key}`}>Integrante</FieldLabel>
            <Input id={`int-persona-${fila.key}`} readOnly value={fila.nombre} />
          </Field>
        ) : (
          <CampoPersona
            id={`int-persona-${fila.key}`}
            dato={fila.dato}
            periodo={periodo}
            disabled={bloqueada || !puedeEscribir}
            error={error?.persona}
            valor={{ fk_funcionario: fila.fk_funcionario, fk_matricula: fila.fk_matricula, nombre: fila.nombre }}
            onChange={(p) => onChange(p)}
          />
        )}
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error?.desde) || undefined}>
          <FieldLabel htmlFor={`int-desde-${fila.key}`}>Desde*</FieldLabel>
          <DatePicker
            id={`int-desde-${fila.key}`}
            disabled={guardada || !puedeEscribir}
            minDate={parseDateValue(inicioPeriodo)}
            maxDate={parseDateValue(finPeriodo)}
            value={parseDateValue(fila.desde)}
            onChange={(d) => onChange({ desde: d ? formatDateValue(d) : "" })}
          />
          {error?.desde && <FieldError>{error.desde}</FieldError>}
        </Field>
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error?.hasta) || undefined}>
          <FieldLabel htmlFor={`int-hasta-${fila.key}`}>Hasta</FieldLabel>
          <DatePicker
            id={`int-hasta-${fila.key}`}
            placeholder="Vigente"
            disabled={guardada || !hastaEditable || !puedeEscribir}
            minDate={parseDateValue(fila.desde)}
            maxDate={parseDateValue(finPeriodo)}
            value={parseDateValue(fila.hasta)}
            onChange={(d) => onChange({ hasta: d ? formatDateValue(d) : "" })}
          />
          {error?.hasta && <FieldError>{error.hasta}</FieldError>}
        </Field>
      </div>
      {puedeEscribir && (
        <Button
          type="button"
          variant="ghost"
          color="neutral"
          size="icon-sm"
          className={bloqueada ? "invisible shrink-0" : "shrink-0"}
          aria-label={`Quitar ${fila.cargo_nombre}`}
          onClick={onQuitar}
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}
