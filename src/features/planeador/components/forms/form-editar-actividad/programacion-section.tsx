import { useSelector } from "@tanstack/react-form"
import { Card } from "@/components/ui/card"
import { DatePicker } from "@/components/date-picker"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { parseDateValue, formatDateValue } from "@/lib/date-value"
import { toDigitsOrRangeInput, toPositiveDigitsInput } from "@/lib/text-input"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useProgramacionActividadQuery } from "@/features/planeador/api/query/use-programacion-actividad-query"
import {
  usePlaneadorPeriodosEvaluacionQuery,
} from "@/features/planeador/api/query/use-planeador-periodos-evaluacion-query"
import { periodosCerrados, rangosDePeriodos } from "@/features/planeador/lib/periodo-cerrado"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { FormActividad } from "@/features/planeador/components/forms/form-editar-actividad/types"
import { formatDiaCorto } from "@/features/planeador/components/forms/form-editar-actividad/helpers"

/** "Entre/Al menos/Hasta" según los extremos que trajo el backend. */
function rangoLabel(min: number | null, max: number | null): string {
  if (min != null && max != null) return `Entre ${min} y ${max}`
  if (min != null) return `Al menos ${min}`
  if (max != null) return `Hasta ${max}`
  return ""
}

/** Ajusta `value` al rango `[min, max]`; se usa en `onBlur` para no trabar el tipeo. */
function clampDigits(value: string, min: number | undefined | null, max: number | undefined | null): string {
  if (!value) return value
  const n = Number(value)
  if (min != null && n < min) return String(min)
  if (max != null && n > max) return String(max)
  return value
}

/** Como `clampDigits`, pero admite un rango ("10-12") y ajusta cada extremo. */
function clampDigitsOrRange(value: string, min: number | undefined | null, max: number | undefined | null): string {
  if (!value) return value
  const partes = value.split("-").map((parte) => clampDigits(parte, min, max))
  return partes.join("-")
}

export function ProgramacionSection({ form, disabled }: { form: FormActividad; disabled: boolean }) {
  // Topes reales de la sección (ventana del periodo, días hábiles, duración, semana).
  const grupoId = useSelector(form.store, (state) => state.values.grupoId)
  const asignaturaId = useSelector(form.store, (state) => state.values.asignaturaId)
  const unidadId = useSelector(form.store, (state) => state.values.unidad.id)
  const { data: programacion } = useProgramacionActividadQuery(grupoId, asignaturaId, unidadId)
  // Periodos de evaluación cerrados: el backend rechaza actividades ahí, se deshabilitan esos días.
  const { data: periodosEvaluacion = [] } = usePlaneadorPeriodosEvaluacionQuery()
  const periodoAcademicoId = programacion?.periodoAcademico?.id
  const cerrados =
    periodoAcademicoId == null
      ? []
      : periodosCerrados(periodosEvaluacion.filter((p) => p.periodoAcademicoId === periodoAcademicoId))
  const rangosCerrados = rangosDePeriodos(cerrados)
  const avisoCerrados =
    cerrados.length > 0
      ? `Periodo cerrado: ${cerrados
          .map((p) => `${p.nombre} (${formatDiaCorto(p.startDate)} – ${formatDiaCorto(p.endDate)})`)
          .join(", ")}. No se pueden programar actividades en esas fechas.`
      : null
  // El error solo se muestra tras tocar el campo o tras un intento de guardar.
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)
  const requerido = (value: string) => (value ? undefined : "Este campo es obligatorio.")

  // Contexto de la ventana de fechas, para que el docente sepa de dónde salen los topes.
  const periodoLabel = programacion?.periodoAcademico
    ? `${programacion.periodoAcademico.nombre} (${programacion.periodoAcademico.fechaInicio?.toLocaleDateString("es-CO") ?? "…"} – ${programacion.periodoAcademico.fechaFin?.toLocaleDateString("es-CO") ?? "…"})`
    : null
  const intensidadLabel = programacion?.intensidadHoraria
    ? `Se dicta ${programacion.intensidadHoraria.diasHabiles.map((d) => d.nombre).join(", ")} · ${programacion.intensidadHoraria.bloquesPorSemana} bloque${programacion.intensidadHoraria.bloquesPorSemana === 1 ? "" : "s"} por semana`
    : null

  // Dígitos necesarios para tipear el `max` real (3 como piso mientras carga).
  const duracionEstimadaMaxDigitos = Math.max(
    String(programacion?.duracionEstimada.max ?? 999).length,
    3,
  )

  return (
    <Card className="gap-4 p-4">
      <div>
        <h3 className="text-base font-semibold">Programación</h3>
        {(periodoLabel || intensidadLabel) && (
          <p className="text-muted-foreground mt-1 text-xs">
            {[periodoLabel, intensidadLabel].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <form.Field name="fechaInicio" validators={{ onChange: ({ value }) => requerido(value) }}>
          {(field) => {
            const isInvalid = (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Fecha inicio *</FieldLabel>
                <DatePicker
                  mode="date"
                  id={field.name}
                  value={parseDateValue(field.state.value)}
                  onChange={(date) => {
                    field.handleChange(formatDateValue(date))
                    field.handleBlur()
                  }}
                  minDate={programacion?.fechaInicio.min ?? undefined}
                  maxDate={programacion?.fechaInicio.max ?? undefined}
                  enabledDaysOfWeek={programacion?.fechaInicio.diasHabiles ?? undefined}
                  disabledRanges={rangosCerrados}
                  disabled={disabled}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                {programacion?.fechaInicio.motivo && (
                  <FieldDescription>{programacion.fechaInicio.motivo}</FieldDescription>
                )}
                {avisoCerrados && <FieldDescription>{avisoCerrados}</FieldDescription>}
              </Field>
            )
          }}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.fechaInicio}>
          {(fechaInicio) => (
            <form.Field
              name="fechaCierre"
              validators={{
                // `onChangeListenTo` revalida el cierre cuando cambia el inicio.
                onChangeListenTo: ["fechaInicio"],
                onChange: ({ value, fieldApi }) => {
                  const faltante = requerido(value)
                  if (faltante) return faltante
                  const inicio = fieldApi.form.getFieldValue("fechaInicio")
                  if (inicio && value < inicio) {
                    return "La fecha de cierre no puede ser anterior a la fecha de inicio."
                  }
                  return undefined
                },
              }}
            >
              {(field) => {
                const isInvalid =
                  (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid
                return (
                  <Field variant="outlined" data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Fecha de entrega o cierre *</FieldLabel>
                    <DatePicker
                      mode="date"
                      id={field.name}
                      value={parseDateValue(field.state.value)}
                      onChange={(date) => {
                        field.handleChange(formatDateValue(date))
                        field.handleBlur()
                      }}
                      // La fecha de inicio elegida manda sobre el mínimo del backend.
                      minDate={
                        parseDateValue(fechaInicio) ?? programacion?.fechaCierre.min ?? undefined
                      }
                      maxDate={programacion?.fechaCierre.max ?? undefined}
                      enabledDaysOfWeek={programacion?.fechaCierre.diasHabiles ?? undefined}
                      disabledRanges={rangosCerrados}
                      disabled={disabled}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    {programacion?.fechaCierre.motivo && (
                      <FieldDescription>{programacion.fechaCierre.motivo}</FieldDescription>
                    )}
                  </Field>
                )
              }}
            </form.Field>
          )}
        </form.Subscribe>

        <form.Field name="duracionEstimada">
          {(field) => (
            <Field variant="outlined">
              {/* Se captura en MINUTOS aunque la descripción de abajo hable de "bloques" (pedido explícito). */}
              <FieldLabel htmlFor={field.name}>Duración estimada (minutos)</FieldLabel>
              {/* `type="text"` + `inputMode="numeric"` (no `number`, acepta `1e5`), sin `0`.
              El tope de dígitos sale del `max` real del backend. */}
              <Input
                id={field.name}
                inputMode="numeric"
                placeholder="Ej: 20"
                maxLength={duracionEstimadaMaxDigitos}
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(toPositiveDigitsInput(e.target.value, duracionEstimadaMaxDigitos))
                }
                // Se ajusta al rango en `onBlur`: clampear al tipear impediría completar "35" con mínimo 30.
                onBlur={(e) => {
                  field.handleBlur()
                  field.handleChange(
                    clampDigits(
                      e.target.value,
                      programacion?.duracionEstimada.min,
                      programacion?.duracionEstimada.max,
                    ),
                  )
                }}
                disabled={disabled}
              />
              {programacion?.duracionEstimada &&
                (programacion.duracionEstimada.min != null || programacion.duracionEstimada.max != null) && (
                  <FieldDescription>
                    {rangoLabel(programacion.duracionEstimada.min, programacion.duracionEstimada.max)}{" "}
                    {(programacion.duracionEstimada.unidad ?? "bloques").toLowerCase()}.
                  </FieldDescription>
                )}
              {programacion?.duracionEstimada.motivo && (
                <FieldDescription>{programacion.duracionEstimada.motivo}</FieldDescription>
              )}
            </Field>
          )}
        </form.Field>

        <form.Field name="semana">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Semana del cronograma</FieldLabel>
              {/* Solo un número o un rango simple ("10-12"). */}
              <Input
                id={field.name}
                inputMode="numeric"
                placeholder="Ej: 10-12"
                maxLength={5}
                value={field.state.value}
                onChange={(e) => field.handleChange(toDigitsOrRangeInput(e.target.value))}
                // Clampea cada extremo al perder el foco.
                onBlur={(e) => {
                  field.handleBlur()
                  field.handleChange(
                    clampDigitsOrRange(
                      e.target.value,
                      programacion?.semanaCronograma.min,
                      programacion?.semanaCronograma.max,
                    ),
                  )
                }}
                disabled={disabled}
              />
              {programacion?.semanaCronograma &&
                (programacion.semanaCronograma.min != null || programacion.semanaCronograma.max != null) && (
                  <FieldDescription>
                    Entre la semana{" "}
                    {rangoLabel(programacion.semanaCronograma.min, programacion.semanaCronograma.max)} del periodo
                    académico.
                  </FieldDescription>
                )}
              {programacion?.semanaCronograma.motivo && (
                <FieldDescription>{programacion.semanaCronograma.motivo}</FieldDescription>
              )}
            </Field>
          )}
        </form.Field>

        <form.Field name="modalidad">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Modalidad</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value as Actividad["modalidad"])}
                disabled={disabled}
              >
                <SelectTrigger id={field.name}>
                  {/* Sin esta función "__none__" se pintaba crudo en el trigger. */}
                  <SelectValue placeholder="Seleccione">
                    {(value) => (value === "__none__" ? "Seleccione" : (value as string))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccione</SelectItem>
                  <SelectItem value="Presencial">Presencial</SelectItem>
                  <SelectItem value="Virtual">Virtual</SelectItem>
                  <SelectItem value="Híbrida">Híbrida</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>
      </div>
    </Card>
  )
}
