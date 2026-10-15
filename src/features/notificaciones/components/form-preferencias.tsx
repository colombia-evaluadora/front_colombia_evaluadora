import { useEffect } from "react"
import { useForm, useSelector } from "@tanstack/react-form"

import { DatePicker } from "@/components/date-picker"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { LockIcon } from "@/components/ui/icons"
import { Switch } from "@/components/ui/switch"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

import {
  preferenciasFormSchema,
  toPreferenciasFormValues,
  type PreferenciasFormValues,
} from "@/features/notificaciones/api/schema"
import type { Preferencias, PreferenciaTipo } from "@/features/notificaciones/api/types"
import { CATEGORIA_LABELS, DIAS_SEMANA } from "@/features/notificaciones/api/ui-mappings"

export const PREFERENCIAS_FORM_ID = "form-preferencias-notificaciones"

const BLOQUEADO_TEXTO = "Definido por tu institución"

interface FormPreferenciasProps {
  preferencias: Preferencias
  onSubmit: (values: PreferenciasFormValues) => void
  /** Sin conexión o guardando: todo el formulario de solo lectura. */
  disabled?: boolean
  onDirtyChange?: (dirty: boolean) => void
}

/**
 * Matriz tipo × canal y horario silencioso (D-3.5). In-app se muestra siempre
 * activo y bloqueado (D-3.1). Las celdas fijadas por la institución quedan
 * deshabilitadas con "Definido por tu institución" (D-3.3). Base UI ignora
 * `<fieldset disabled>`: cada control recibe `disabled` explícito.
 */
export function FormPreferencias({ preferencias, onSubmit, disabled = false, onDirtyChange }: FormPreferenciasProps) {
  const form = useForm({
    defaultValues: toPreferenciasFormValues(preferencias),
    validators: { onChange: preferenciasFormSchema, onSubmit: preferenciasFormSchema },
    onSubmit: ({ value }) => onSubmit(preferenciasFormSchema.parse(value)),
  })

  const isDefaultValue = useSelector(form.store, (s) => s.isDefaultValue)
  const submissionAttempts = useSelector(form.store, (s) => s.submissionAttempts)
  const horarioActivo = useSelector(form.store, (s) => s.values.horarioSilencioso.activo)

  useEffect(() => {
    onDirtyChange?.(!isDefaultValue)
  }, [isDefaultValue, onDirtyChange])

  const horario = preferencias.horarioSilencioso
  const horarioBloqueado = disabled || horario.bloqueado

  const celdaCanal = (index: number, canal: "push" | "email", tipo: PreferenciaTipo) => {
    const bloqueado = canal === "push" ? tipo.pushBloqueado : tipo.emailBloqueado
    const nombreCanal = canal === "push" ? "push" : "correo"
    return (
      <td className="px-2 py-2 text-center">
        <form.Field name={`tipos[${index}].${canal}`}>
          {(field) => (
            <span className="inline-flex items-center gap-1" title={bloqueado ? BLOQUEADO_TEXTO : undefined}>
              <Switch
                checked={Boolean(field.state.value)}
                disabled={disabled || bloqueado}
                aria-label={`${tipo.etiqueta}: ${nombreCanal}${bloqueado ? ` (${BLOQUEADO_TEXTO})` : ""}`}
                onCheckedChange={(checked) => field.handleChange(checked)}
              />
              {bloqueado && <LockIcon aria-hidden className="size-3.5 text-muted-foreground" />}
            </span>
          )}
        </form.Field>
      </td>
    )
  }

  return (
    <form
      id={PREFERENCIAS_FORM_ID}
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <section aria-labelledby="pref-matriz-titulo" className="flex flex-col gap-2">
        <div>
          <h2 id="pref-matriz-titulo" className="text-sm font-semibold">
            Canales por tipo de notificación
          </h2>
          <p className="text-sm text-muted-foreground">
            La bandeja de la aplicación siempre recibe todas tus notificaciones; aquí eliges qué más quieres recibir
            por push y por correo.
          </p>
        </div>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  Tipo
                </th>
                <th scope="col" className="w-24 px-2 py-2 text-center font-medium">
                  En la app
                </th>
                <th scope="col" className="w-24 px-2 py-2 text-center font-medium">
                  Push
                </th>
                <th scope="col" className="w-24 px-2 py-2 text-center font-medium">
                  Correo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {preferencias.tipos.map((tipo, index) => (
                <tr key={tipo.tipo}>
                  <th scope="row" className="px-4 py-2 text-left font-normal">
                    <span className="block">{tipo.etiqueta}</span>
                    <span className="block text-xs text-muted-foreground">{CATEGORIA_LABELS[tipo.categoria]}</span>
                  </th>
                  <td className="px-2 py-2 text-center">
                    <Switch checked disabled aria-label={`${tipo.etiqueta}: en la app (siempre activo)`} />
                  </td>
                  {celdaCanal(index, "push", tipo)}
                  {celdaCanal(index, "email", tipo)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="pref-horario-titulo" className="flex flex-col gap-3">
        <div>
          <h2 id="pref-horario-titulo" className="text-sm font-semibold">
            Horario silencioso
          </h2>
          <p className="text-sm text-muted-foreground">
            Durante este horario no se envían push ni correos; se entregan al terminar si siguen sin leer. Los avisos
            urgentes de la institución sí llegan. Zona horaria: {horario.zona}.
          </p>
          {horario.bloqueado && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <LockIcon aria-hidden className="size-3.5" />
              {BLOQUEADO_TEXTO}
            </p>
          )}
        </div>

        <form.Field name="horarioSilencioso.activo">
          {(field) => (
            <Field orientation="horizontal">
              <Switch
                id={field.name}
                checked={field.state.value}
                disabled={horarioBloqueado}
                onCheckedChange={(checked) => field.handleChange(checked)}
              />
              <FieldLabel htmlFor={field.name}>Activar horario silencioso</FieldLabel>
            </Field>
          )}
        </form.Field>

        {horarioActivo && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {(["desde", "hasta"] as const).map((clave) => (
                <form.Field key={clave} name={`horarioSilencioso.${clave}`}>
                  {(field) => {
                    const isInvalid =
                      (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid
                    return (
                      <Field variant="outlined" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>{clave === "desde" ? "Desde*" : "Hasta*"}</FieldLabel>
                        <DatePicker
                          mode="time"
                          id={field.name}
                          value={field.state.value}
                          disabled={horarioBloqueado}
                          onChange={(value) => {
                            field.handleChange(value)
                            field.handleBlur()
                          }}
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                </form.Field>
              ))}
            </div>

            <form.Field name="horarioSilencioso.dias">
              {(field) => {
                const isInvalid = (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel>Días</FieldLabel>
                    <div className="flex flex-wrap gap-1" role="group" aria-label="Días del horario silencioso">
                      {DIAS_SEMANA.map((dia) => {
                        const activo = field.state.value.includes(dia.value)
                        return (
                          <Toggle
                            key={dia.value}
                            variant="outline"
                            aria-label={dia.label}
                            title={dia.label}
                            pressed={activo}
                            disabled={horarioBloqueado}
                            className={cn("size-9", activo && "bg-primary text-primary-foreground")}
                            onPressedChange={(pressed) => {
                              const next = pressed
                                ? [...field.state.value, dia.value]
                                : field.state.value.filter((d) => d !== dia.value)
                              field.handleChange(next)
                              field.handleBlur()
                            }}
                          >
                            {dia.corto}
                          </Toggle>
                        )
                      })}
                    </div>
                    <FieldDescription>Un rango que cruza la medianoche (22:00 a 06:00) es válido.</FieldDescription>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            </form.Field>
          </div>
        )}
      </section>
    </form>
  )
}
