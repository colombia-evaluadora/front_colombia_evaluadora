import { useStore } from "@tanstack/react-form"

import { SelectItemsDialog } from "@/components/select-items-dialog"
import { Badge } from "@/components/ui/badge"
import { Field, FieldDescription, FieldError } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { isFieldInvalid, toFieldErrors, useFieldContext, useFormDisabled } from "@/lib/forms"
import { cn } from "@/lib/utils"

import type {
  CampoOpcion,
  ReglaOpcion,
} from "@/features/administration/criterios-prioridad/api/types/criterio-prioridad"

/*
 * Campos propios del formulario de criterio, montados con `useFieldContext`
 * dentro de `<form.AppField>`: el campo y la regla son radios a la vista (hay
 * que poder leer por qué una regla no aplica) y los valores, el selector
 * múltiple de la app.
 */

function useCampoState<T>() {
  const field = useFieldContext<T>()
  const state = useStore(field.store, (s) => s)
  const submissionAttempts = useStore(field.form.store, (s) => s.submissionAttempts)
  return {
    field,
    value: state.value,
    invalid: isFieldInvalid({ state }, submissionAttempts),
    errors: toFieldErrors(state.meta.errors),
    disabled: useFormDisabled(),
  }
}

function Encabezado({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span id={id} className="text-sm font-medium">
      {children}
    </span>
  )
}

const tipoTexto = (campo: CampoOpcion) =>
  campo.tipo === "SI_NO"
    ? "Sí/No"
    : campo.categoria
      ? `Selector${campo.esOrdinal ? " · lista ordinal" : ""}`
      : "Selector"

/** Campo del bloque elegido. Sin bloque, una ayuda en su lugar. */
export function CampoRadios({ campos, sinBloque }: { campos: CampoOpcion[]; sinBloque: boolean }) {
  const { field, value, invalid, errors, disabled } = useCampoState<number>()
  return (
    <Field data-invalid={invalid} className="gap-2" aria-labelledby="criterio-campo-label">
      <Encabezado id="criterio-campo-label">Campo*</Encabezado>
      {sinBloque ? (
        <FieldDescription>Elija primero el bloque.</FieldDescription>
      ) : (
        <RadioGroup
          value={value || null}
          onValueChange={(next) => {
            field.handleChange(Number(next))
            field.handleBlur()
          }}
          disabled={disabled}
          className="grid gap-2 sm:grid-cols-2"
        >
          {campos.map((campo) => (
            <label
              key={campo.pkCampo}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-md border border-border px-3 py-2.5 text-sm",
                value === campo.pkCampo && "border-primary/40 bg-primary/5",
                disabled && "cursor-not-allowed opacity-70",
              )}
            >
              <RadioGroupItem value={campo.pkCampo} aria-invalid={invalid} className="mt-0.5" />
              <span className="flex flex-col gap-0.5">
                <span>{campo.nombre}</span>
                <span className="text-xs text-muted-foreground">{tipoTexto(campo)}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      )}
      {invalid && <FieldError errors={errors} />}
    </Field>
  )
}

/** Reglas de la lista Regla de prioridad; las que el campo no admite, deshabilitadas con su motivo. */
export function ReglaRadios({ reglas, sinCampo }: { reglas: ReglaOpcion[]; sinCampo: boolean }) {
  const { field, value, invalid, errors, disabled } = useCampoState<number>()
  return (
    <Field data-invalid={invalid} className="gap-2" aria-labelledby="criterio-regla-label">
      <Encabezado id="criterio-regla-label">Regla*</Encabezado>
      {sinCampo ? (
        <FieldDescription>Elija primero el campo: la regla depende de su tipo.</FieldDescription>
      ) : (
        <RadioGroup
          value={value || null}
          onValueChange={(next) => {
            field.handleChange(Number(next))
            field.handleBlur()
          }}
          disabled={disabled}
          className="gap-1.5"
        >
          {reglas.map((regla) => {
            const noAplica = regla.motivo != null
            return (
              <label
                key={regla.pkRegla}
                className={cn(
                  "flex items-start gap-2.5 rounded-md px-1 py-1 text-sm",
                  noAplica || disabled ? "cursor-not-allowed" : "cursor-pointer",
                )}
              >
                <RadioGroupItem
                  value={regla.pkRegla}
                  disabled={noAplica}
                  aria-invalid={invalid}
                  className="mt-0.5"
                />
                <span className="flex flex-col gap-0.5">
                  <span className={noAplica ? "text-muted-foreground" : undefined}>
                    {regla.nombre}
                  </span>
                  {noAplica && (
                    <span className="text-xs text-muted-foreground">{regla.motivo}</span>
                  )}
                </span>
              </label>
            )
          })}
        </RadioGroup>
      )}
      {invalid && <FieldError errors={errors} />}
    </Field>
  )
}

/** Valores de la lista del campo, solo con Es uno de. */
export function ValoresSelect({
  opciones,
}: {
  opciones: { pkListaValor: number; nombre: string }[]
}) {
  const { field, value, invalid, errors, disabled } = useCampoState<number[]>()
  const seleccion = value ?? []
  return (
    <Field data-invalid={invalid} className="gap-2" aria-labelledby="criterio-valores-label">
      <Encabezado id="criterio-valores-label">Valores*</Encabezado>
      {disabled ? (
        // El selector no tiene modo de solo lectura: se muestran los elegidos.
        <ul className="flex flex-wrap gap-1.5">
          {opciones
            .filter((o) => seleccion.includes(o.pkListaValor))
            .map((o) => (
              <li key={o.pkListaValor}>
                <Badge variant="soft" color="neutral">
                  {o.nombre}
                </Badge>
              </li>
            ))}
        </ul>
      ) : (
        <SelectItemsDialog
          id="criterio-valores"
          items={opciones.map((o) => ({ id: o.pkListaValor, label: o.nombre }))}
          value={seleccion}
          onChange={(ids) => {
            field.handleChange(ids)
            field.handleBlur()
          }}
          invalid={invalid}
          placeholder="Seleccione"
          dialogTitle="Seleccionar valores"
          searchPlaceholder="Buscar valor..."
          emptyMessage="No se encontraron valores."
          selectedCountLabel={(n) =>
            n === 1 ? "1 valor seleccionado" : `${n} valores seleccionados`
          }
        />
      )}
      {invalid ? (
        <FieldError errors={errors} />
      ) : (
        <FieldDescription>Cumple quien tiene alguno de los valores elegidos.</FieldDescription>
      )}
    </Field>
  )
}

/** Activo / Inactivo, con el efecto de desactivar (Regla 16). Va fuera del bloque protegido. */
export function EstadoCriterio({ disabled }: { disabled?: boolean }) {
  const { field, value } = useCampoState<boolean>()
  const checked = Boolean(value)
  return (
    <label
      htmlFor="criterio-estado"
      className={cn(
        "flex items-start gap-3 rounded-md border px-3 py-2.5",
        checked ? "border-border" : "border-dashed border-border bg-muted/40",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <Switch
        id="criterio-estado"
        size="sm"
        round
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => !disabled && field.handleChange(next)}
      />
      <span className="flex flex-col gap-0.5 text-sm">
        <span className={cn("font-medium", !checked && "text-muted-foreground")}>
          {checked ? "Activo" : "Inactivo"}
        </span>
        <span className="text-xs text-muted-foreground">
          {checked
            ? "El Rector puede elegirlo en la Configuración de la admisión. Si lo desactiva, deja de ofrecerse; los períodos que ya lo usan no cambian."
            : "No se ofrece en la Configuración de la admisión. Los períodos que ya lo usan no cambian."}
        </span>
      </span>
    </label>
  )
}
