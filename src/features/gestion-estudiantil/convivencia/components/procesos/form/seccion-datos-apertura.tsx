import { useMemo } from "react"

import { DatePicker } from "@/components/date-picker"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import type { ProcesoFormState } from "@/features/gestion-estudiantil/convivencia/hooks/use-proceso-form"

/** Fecha de apertura, responsable y plazo para descargos (solo lectura, recalculado por el servidor). */
export function SeccionDatosApertura({ form }: { form: ProcesoFormState }) {
  const { v, set, errores, responsables, plazo } = form
  const opcionesResponsable = useMemo(
    () => (responsables.data ?? []).map((r) => ({ value: String(r.fk_tfuncionario), label: `${r.nombre} · ${r.rol_nombre}` })),
    [responsables.data],
  )
  const plazoTexto = !v.matricula ? "" : plazo.isFetching ? "Calculando…" : formatFecha(plazo.data?.plazo_descargos)
  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
      <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores.fecha) || undefined}>
        <FieldLabel htmlFor="proceso-fecha">Fecha de apertura*</FieldLabel>
        <DatePicker
          id="proceso-fecha"
          maxDate={new Date()}
          value={parseDateValue(v.fecha)}
          onChange={(date) => set({ fecha: date ? formatDateValue(date) : "" })}
        />
        {errores.fecha && <FieldError>{errores.fecha}</FieldError>}
      </Field>
      <ComboOpciones
        id="proceso-responsable"
        label="Responsable del proceso"
        required
        size="default"
        todos={false}
        disabled={!v.matricula}
        placeholder={v.matricula ? "Seleccione" : "Elija primero el estudiante"}
        value={v.responsable}
        options={opcionesResponsable}
        error={errores.responsable}
        onChange={(responsable) => set({ responsable })}
      />
      <Field orientation="vertical" variant="outlined" className="gap-2">
        <FieldLabel htmlFor="proceso-plazo">Plazo para descargos</FieldLabel>
        <Input id="proceso-plazo" readOnly value={plazoTexto} />
        <p className="text-xs text-muted-foreground">
          {plazo.data ? `${plazo.data.dias_habiles} días hábiles desde la apertura.` : "Días hábiles desde la apertura."}
        </p>
      </Field>
    </div>
  )
}
