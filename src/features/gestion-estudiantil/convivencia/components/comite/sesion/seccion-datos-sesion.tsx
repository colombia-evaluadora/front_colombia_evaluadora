import { DatePicker } from "@/components/date-picker"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { LIM } from "@/features/gestion-estudiantil/convivencia/utils/comite"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import type { SesionFormState } from "@/features/gestion-estudiantil/convivencia/hooks/use-sesion-form"

/** Hoy, o el fin del período si ya terminó. */
function tope(fin?: string) {
  const hoy = new Date()
  const f = fin ? parseDateValue(fin) : undefined
  return f && f < hoy ? f : hoy
}

/** Período (solo lectura), Tipo y Fecha de la sesión. */
export function SeccionDatosSesion({
  form,
  periodoRotulo,
  inicio,
  fin,
}: {
  form: SesionFormState
  periodoRotulo: string
  /** Límites del período académico (YYYY-MM-DD): la sesión cae dentro de él y no es futura. */
  inicio?: string
  fin?: string
}) {
  const { v, set, errores } = form
  const tipos = useCatalogo("TIPO_SESION_COMITE")
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Período académico: <span className="text-foreground">{periodoRotulo}</span>
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
          minDate={inicio ? parseDateValue(inicio) : undefined}
          maxDate={tope(fin)}
          value={parseDateValue(v.fecha)}
          onChange={(d) => form.cambiarFecha(d ? formatDateValue(d) : "")}
        />
        {errores.fecha && <FieldError>{errores.fecha}</FieldError>}
      </Field>
      <Field orientation="vertical" variant="outlined" className="gap-2">
        <FieldLabel htmlFor="sesion-hora">Hora</FieldLabel>
        <DatePicker id="sesion-hora" mode="time" value={v.hora} onChange={(hora) => set({ hora })} />
      </Field>
      <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores.lugar) || undefined}>
        <FieldLabel htmlFor="sesion-lugar">Lugar</FieldLabel>
        <Input
          id="sesion-lugar"
          maxLength={LIM.lugar}
          value={v.lugar}
          aria-invalid={Boolean(errores.lugar) || undefined}
          onChange={(e) => set({ lugar: e.target.value })}
        />
        {errores.lugar && <FieldError>{errores.lugar}</FieldError>}
      </Field>
      </div>
      <div className="flex flex-col gap-4">
        <TextoLargo
          id="sesion-objetivo"
          label="Objetivo"
          rows={2}
          max={LIM.objetivo}
          descripcion="El propósito de la sesión."
          value={v.objetivo}
          error={errores.objetivo}
          onChange={(objetivo) => set({ objetivo })}
        />
        <TextoLargo
          id="sesion-orden-dia"
          label="Orden del día"
          rows={4}
          max={LIM.ordenDia}
          descripcion="Los puntos que se van a tratar."
          value={v.ordenDia}
          error={errores.ordenDia}
          onChange={(ordenDia) => set({ ordenDia })}
        />
      </div>
    </div>
  )
}
