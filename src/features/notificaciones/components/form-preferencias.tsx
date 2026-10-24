import { useEffect } from "react"
import { useForm, useSelector } from "@tanstack/react-form"

import { DatePicker } from "@/components/date-picker"
import { FormSectionHeading } from "@/components/form-section-heading"
import { Badge } from "@/components/ui/badge"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { LockIcon } from "@/components/ui/icons"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

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
 *
 * La matriz copia la de permisos por vista de roles-menus
 * (`role-views-editor.tsx`): `Table` de `ui/`, `Switch round` y el motivo de
 * un bloqueo en un `Tooltip` (no en un `title` nativo).
 */
export function FormPreferencias({
  preferencias,
  onSubmit,
  disabled = false,
  onDirtyChange,
}: FormPreferenciasProps) {
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
      <TableCell>
        <form.Field name={`tipos[${index}].${canal}`}>
          {(field) => (
            <span className="inline-flex items-center gap-2">
              <Switch
                round
                checked={Boolean(field.state.value)}
                disabled={disabled || bloqueado}
                aria-label={`${tipo.etiqueta}: ${nombreCanal}${bloqueado ? ` (${BLOQUEADO_TEXTO})` : ""}`}
                onCheckedChange={(checked) => field.handleChange(checked)}
              />
              {bloqueado && <BloqueadoIndicador />}
            </span>
          )}
        </form.Field>
      </TableCell>
    )
  }

  return (
    <form
      id={PREFERENCIAS_FORM_ID}
      noValidate
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <section aria-labelledby="pref-matriz-titulo" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <FormSectionHeading as="h2" id="pref-matriz-titulo">
            Medios de aviso por tipo de notificación
          </FormSectionHeading>
          <p className="text-sm text-muted-foreground">
            La bandeja de la aplicación siempre recibe todas tus notificaciones; aquí eliges qué más
            quieres recibir por push y por correo.
          </p>
        </div>
        <Table containerClassName="border">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-foreground">Tipo</TableHead>
              <TableHead className="w-32 text-foreground">En la app</TableHead>
              <TableHead className="w-32 text-foreground">Push</TableHead>
              <TableHead className="w-32 text-foreground">Correo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preferencias.tipos.map((tipo, index) => (
              <TableRow key={tipo.tipo}>
                <TableCell className="whitespace-normal">
                  <span className="flex flex-col items-start gap-1">
                    <span className="font-medium">{tipo.etiqueta}</span>
                    <Badge variant="soft" color="muted">
                      {CATEGORIA_LABELS[tipo.categoria]}
                    </Badge>
                  </span>
                </TableCell>
                <TableCell>
                  <Switch
                    round
                    checked
                    disabled
                    aria-label={`${tipo.etiqueta}: en la app (siempre activo)`}
                  />
                </TableCell>
                {celdaCanal(index, "push", tipo)}
                {celdaCanal(index, "email", tipo)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section aria-labelledby="pref-horario-titulo" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <FormSectionHeading as="h2" id="pref-horario-titulo">
            Horario silencioso
          </FormSectionHeading>
          <p className="text-sm text-muted-foreground">
            Durante este horario no se envían push ni correos; se entregan al terminar si siguen sin
            leer. Los avisos urgentes de la institución sí llegan. Zona horaria: {horario.zona}.
          </p>
          {horario.bloqueado && (
            <Badge variant="outline" color="muted" className="mt-1">
              <LockIcon data-icon="inline-start" />
              {BLOQUEADO_TEXTO}
            </Badge>
          )}
        </div>

        <form.Field name="horarioSilencioso.activo">
          {(field) => (
            <Field orientation="horizontal">
              <Switch
                id={field.name}
                round
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
                      (field.state.meta.isTouched || submissionAttempts > 0) &&
                      !field.state.meta.isValid
                    return (
                      <Field variant="outlined" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          {clave === "desde" ? "Desde*" : "Hasta*"}
                        </FieldLabel>
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
                const isInvalid =
                  (field.state.meta.isTouched || submissionAttempts > 0) &&
                  !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel>Días</FieldLabel>
                    {/* Selección múltiple con el `ToggleGroup` del sistema (como
                        el filtro de estado de auditoría): los días van como
                        string en el grupo y como número (1-7) en el form. */}
                    <ToggleGroup
                      multiple
                      spacing={0}
                      variant="outline"
                      aria-label="Días del horario silencioso"
                      disabled={horarioBloqueado}
                      value={field.state.value.map(String)}
                      onValueChange={(value: string[]) => {
                        field.handleChange(value.map(Number))
                        field.handleBlur()
                      }}
                    >
                      {DIAS_SEMANA.map((dia) => (
                        <ToggleGroupItem
                          key={dia.value}
                          value={String(dia.value)}
                          size="sm"
                          aria-label={dia.label}
                          className="min-w-9"
                        >
                          {dia.corto}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                    <FieldDescription>
                      Un rango que cruza la medianoche (22:00 a 06:00) es válido.
                    </FieldDescription>
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

function BloqueadoIndicador() {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex text-muted-foreground" />}>
        <LockIcon aria-hidden className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>{BLOQUEADO_TEXTO}</TooltipContent>
    </Tooltip>
  )
}
