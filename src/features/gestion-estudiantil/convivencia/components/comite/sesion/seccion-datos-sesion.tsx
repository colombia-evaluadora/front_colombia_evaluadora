import { DatePicker } from "@/components/date-picker"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import type { SesionFormState } from "@/features/gestion-estudiantil/convivencia/hooks/use-sesion-form"

/** Período (solo lectura), Tipo y Fecha de la sesión. */
export function SeccionDatosSesion({ form, periodoRotulo }: { form: SesionFormState; periodoRotulo: string }) {
  const { v, set, errores } = form
  const tipos = useCatalogo("TIPO_SESION_COMITE")
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Período Académico: <span className="text-foreground">{periodoRotulo}</span>
      </p>
      <div className="grid grid-cols-1 items-start gap-3 sm:max-w-2xl sm:grid-cols-2">
      <ComboOpciones
        id="sesion-tipo"
        label="Tipo de sesión"
        required
        size="default"
        todos={false}
        value={v.tipo}
        options={tipos}
        error={errores.tipo}
        onChange={(tipo) => set({ tipo })}
      />
      <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores.fecha) || undefined}>
        <FieldLabel htmlFor="sesion-fecha">Fecha*</FieldLabel>
        <DatePicker
          id="sesion-fecha"
          value={parseDateValue(v.fecha)}
          onChange={(d) => form.cambiarFecha(d ? formatDateValue(d) : "")}
        />
        {errores.fecha && <FieldError>{errores.fecha}</FieldError>}
      </Field>
      </div>
    </div>
  )
}
