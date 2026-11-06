import type { ReactNode } from "react"
import { useStore } from "@tanstack/react-form"

import { SelectItemsDialog } from "@/components/select-items-dialog"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
  ComboboxLabel,
} from "@/components/ui/combobox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { InfoIcon, LockIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { isFieldInvalid, toFieldErrors, useFieldContext, useFormDisabled } from "@/lib/forms"
import { cn } from "@/lib/utils"

import {
  bloqueTexto,
  type BloqueOpcion,
  type CampoOpcion,
  type ReglaOpcion,
} from "@/features/administration/criterios-prioridad/api/types/criterio-prioridad"

/*
 * Campos propios del formulario de criterio, montados con `useFieldContext`
 * dentro de `<form.AppField>`.
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

/** Etiqueta con su ayuda en un ícono (i). */
export function LabelAyuda({ children, ayuda }: { children: ReactNode; ayuda: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {children}
      <Tooltip>
        <TooltipTrigger
          render={<span tabIndex={0} aria-label={ayuda} className="inline-flex text-muted-foreground" />}
        >
          <InfoIcon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{ayuda}</TooltipContent>
      </Tooltip>
    </span>
  )
}

const GRUPOS = ["Estudiante", "Acudiente", "Inscripción"] as const

/** 2.2–2.9 son del estudiante; 2.10–2.13, del acudiente. */
function grupoDe(bloque: BloqueOpcion): (typeof GRUPOS)[number] {
  if (bloque.codigo === "INSCRIPCION") return "Inscripción"
  return Number(bloque.codigo.split(".")[1]) >= 10 ? "Acudiente" : "Estudiante"
}

/** Bloque con búsqueda, agrupado por Estudiante, Acudiente e Inscripción. */
export function BloqueSelect({ bloques }: { bloques: BloqueOpcion[] }) {
  const { field, value, invalid, errors, disabled } = useCampoState<string>()
  const items = Object.fromEntries(bloques.map((b) => [b.codigo, bloqueTexto(b)]))
  return (
    <Field variant="outlined" data-invalid={invalid} data-disabled={disabled || undefined}>
      <FieldLabel htmlFor="criterio-bloque">
        <LabelAyuda ayuda="Sección de la matrícula (2.2 a 2.13) o la Inscripción donde está el campo.">
          Bloque*
        </LabelAyuda>
      </FieldLabel>
      <ComboboxField
        items={items}
        value={value || null}
        disabled={disabled}
        onValueChange={(next) => {
          if (next == null) return
          field.handleChange(next)
          field.handleBlur()
        }}
      >
        <ComboboxFieldTrigger id="criterio-bloque" variant="outlined" aria-invalid={invalid} className="w-full">
          <ComboboxFieldValue placeholder="Seleccione" />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {GRUPOS.map((grupo) => {
            const delGrupo = bloques.filter((b) => grupoDe(b) === grupo)
            if (delGrupo.length === 0) return null
            return (
              <ComboboxGroup key={grupo}>
                <ComboboxLabel>{grupo}</ComboboxLabel>
                {delGrupo.map((b) => (
                  <ComboboxFieldItem key={b.codigo} value={b.codigo}>
                    {bloqueTexto(b)}
                  </ComboboxFieldItem>
                ))}
              </ComboboxGroup>
            )
          })}
        </ComboboxFieldContent>
      </ComboboxField>
      {invalid && <FieldError errors={errors} />}
    </Field>
  )
}

const NOMBRE_ORDEN = "los órdenes"

/** "Talento del estudiante es un selector: Es Sí y los órdenes no aplican." */
export function reglaResumen(campo: CampoOpcion) {
  const noAplican = campo.reglas.filter((r) => r.motivo != null)
  if (noAplican.length === 0) return null
  const ordenes = noAplican.filter((r) => r.codigo === "MENOR_A_MAYOR" || r.codigo === "MAYOR_A_MENOR")
  const nombres = noAplican.filter((r) => !ordenes.includes(r)).map((r) => r.nombre)
  if (ordenes.length === 2) nombres.push(NOMBRE_ORDEN)
  else nombres.push(...ordenes.map((r) => r.nombre))
  const lista = nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}` : nombres[0]
  const plural = nombres.length > 1 || nombres[0] === NOMBRE_ORDEN
  const sujeto =
    campo.tipo === "SI_NO"
      ? "El campo es Sí/No"
      : campo.categoria == null
        ? `${campo.nombre} no usa una lista de valores`
        : `${campo.nombre} es un selector${campo.esOrdinal ? " de lista ordinal" : ""}`
  return `${sujeto}: ${lista} ${plural ? "no aplican" : "no aplica"}.`
}

/** Reglas en línea; las que el campo no admite van deshabilitadas con su motivo. */
export function ReglaRadios({ campo }: { campo: CampoOpcion | undefined }) {
  const { field, value, invalid, errors, disabled } = useCampoState<number>()
  const reglas: ReglaOpcion[] = campo?.reglas ?? []
  const resumen = campo ? reglaResumen(campo) : null
  return (
    <Field data-invalid={invalid} className="gap-2" aria-labelledby="criterio-regla-label">
      <span id="criterio-regla-label" className="text-sm font-medium">
        <LabelAyuda ayuda="Cómo se evalúa el campo. Depende de su tipo: las reglas de orden solo aplican a listas ordinales.">
          Regla*
        </LabelAyuda>
      </span>
      {!campo ? (
        <FieldDescription>Elija primero el campo: la regla depende de su tipo.</FieldDescription>
      ) : (
        <RadioGroup
          value={value || null}
          onValueChange={(next) => {
            field.handleChange(Number(next))
            field.handleBlur()
          }}
          disabled={disabled}
          className="flex flex-wrap gap-x-5 gap-y-2"
        >
          {reglas.map((regla) => {
            const noAplica = regla.motivo != null
            return (
              <label
                key={regla.pkRegla}
                title={regla.motivo ?? undefined}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  noAplica ? "cursor-not-allowed text-muted-foreground opacity-70" : "cursor-pointer",
                )}
              >
                <RadioGroupItem value={regla.pkRegla} disabled={noAplica} aria-invalid={invalid} />
                {regla.nombre}
              </label>
            )
          })}
        </RadioGroup>
      )}
      {invalid ? (
        <FieldError errors={errors} />
      ) : (
        resumen && <FieldDescription>{resumen}</FieldDescription>
      )}
    </Field>
  )
}

/** Valores de la lista del campo, solo con Es uno de. */
export function ValoresSelect({ opciones }: { opciones: { pkListaValor: number; nombre: string }[] }) {
  const { field, value, invalid, errors } = useCampoState<number[]>()
  const seleccion = value ?? []
  return (
    <Field data-invalid={invalid} className="gap-2" aria-labelledby="criterio-valores-label">
      <span id="criterio-valores-label" className="text-sm font-medium">
        Valores*
      </span>
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
        selectedCountLabel={(n) => `${n} de ${opciones.length} seleccionados`}
      />
      {invalid ? (
        <FieldError errors={errors} />
      ) : (
        <FieldDescription>Cumple quien tiene alguno de los valores elegidos.</FieldDescription>
      )}
    </Field>
  )
}

/** Activo / Inactivo (Regla 16). Va fuera del bloque protegido: en uso, es lo único editable. */
export function EstadoCriterio({ disabled }: { disabled?: boolean }) {
  const { field, value } = useCampoState<boolean>()
  return (
    <Field className="gap-2" aria-labelledby="criterio-estado-label">
      <span id="criterio-estado-label" className="text-sm font-medium">
        Estado*
      </span>
      <RadioGroup
        value={value ? "A" : "I"}
        onValueChange={(next) => field.handleChange(next === "A")}
        disabled={disabled}
        className="flex flex-wrap gap-x-5 gap-y-2"
      >
        {(
          [
            ["A", "Activo"],
            ["I", "Inactivo"],
          ] as const
        ).map(([v, texto]) => (
          <label
            key={v}
            className={cn("flex items-center gap-2 text-sm", disabled ? "cursor-not-allowed" : "cursor-pointer")}
          >
            <RadioGroupItem value={v} />
            {texto}
          </label>
        ))}
      </RadioGroup>
      {!value && (
        <FieldDescription>
          Desactivado, deja de ofrecerse para configuraciones de admisión nuevas. Los períodos que ya lo usan
          no cambian.
        </FieldDescription>
      )}
    </Field>
  )
}

/** Dato protegido (en uso o ver detalle): se muestra con candado. */
export function CampoBloqueado({
  label,
  valor,
  className,
}: {
  label: ReactNode
  valor: string
  className?: string
}) {
  return (
    <Field variant="outlined" data-disabled className={className}>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <Input value={valor} disabled readOnly title={valor} className="pr-9" />
        <LockIcon aria-hidden className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </Field>
  )
}
