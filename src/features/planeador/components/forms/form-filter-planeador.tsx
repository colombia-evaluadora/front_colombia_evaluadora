import { useMemo } from "react"
import { useForm } from "@tanstack/react-form"

import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"

import {
  planeadorFiltersFormSchema,
  type PlaneadorFiltersFormInput,
  type PlaneadorFiltersFormValues,
} from "@/features/planeador/api/schema"
import { ESTADO_OPTIONS } from "@/features/planeador/api/ui-mappings"
import {
  INSTRUMENTO_OPTIONS,
  VIEW_OPTIONS,
} from "@/features/planeador/components/view-options"

/** Valor de la opción "Todos": el filtro vacío. */
const ALL_VALUE = ""

interface FilterPlaneadorFormProps {
  id: string
  defaultValues: PlaneadorFiltersFormInput
  onSubmit: (values: PlaneadorFiltersFormValues) => void
}

/**
 * Campos del panel de "Filtros avanzados" del Planeador. Mismo molde que los
 * `form-filter-*` de los otros listados: un `<form>` con `id`, que el botón
 * "Aplicar filtros" del popover dispara por `form=…`.
 *
 * `buscar` no está acá: la búsqueda libre se escribe en el input de la barra
 * y el buscador la reinyecta al aplicar, para que abrir el panel no borre lo
 * que ya estaba escrito.
 */
export function FilterPlaneadorForm({
  id,
  defaultValues,
  onSubmit,
}: FilterPlaneadorFormProps) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: planeadorFiltersFormSchema },
    onSubmit: ({ value }) => onSubmit(value),
  })

  const estadoItems = useMemo<Record<string, string>>(
    () => Object.fromEntries(ESTADO_OPTIONS.map((o) => [o.value, o.label])),
    [],
  )
  const instrumentoItems = useMemo<Record<string, string>>(
    () => Object.fromEntries(INSTRUMENTO_OPTIONS.map((o) => [o.value, o.label])),
    [],
  )
  const vistaItems = useMemo<Record<string, string>>(
    () => Object.fromEntries(VIEW_OPTIONS.map((o) => [o.value, o.label])),
    [],
  )

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-1 flex-col gap-5 px-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <form.Field name="vista">
          {(field) => (
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor={field.name}>Ver por</FieldLabel>
              <ComboboxField
                items={vistaItems}
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value ?? "")}
              >
                <ComboboxFieldTrigger id={field.name} size="sm" className="w-full">
                  <ComboboxFieldValue placeholder="Actividad" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  <ComboboxGroup>
                    <ComboboxFieldItem value={ALL_VALUE}>Actividad</ComboboxFieldItem>
                    {VIEW_OPTIONS.filter((o) => o.value !== "actividad").map((option) => (
                      <ComboboxFieldItem key={option.value} value={option.value}>
                        {option.label}
                      </ComboboxFieldItem>
                    ))}
                  </ComboboxGroup>
                </ComboboxFieldContent>
              </ComboboxField>
            </Field>
          )}
        </form.Field>

        <form.Field name="estado">
          {(field) => (
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor={field.name}>Estado</FieldLabel>
              <ComboboxField
                items={estadoItems}
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value ?? "")}
              >
                <ComboboxFieldTrigger id={field.name} size="sm" className="w-full">
                  <ComboboxFieldValue placeholder="Todos" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  <ComboboxGroup>
                    <ComboboxFieldItem value={ALL_VALUE}>Todos</ComboboxFieldItem>
                    {ESTADO_OPTIONS.map((option) => (
                      <ComboboxFieldItem key={option.value} value={option.value}>
                        {option.label}
                      </ComboboxFieldItem>
                    ))}
                  </ComboboxGroup>
                </ComboboxFieldContent>
              </ComboboxField>
            </Field>
          )}
        </form.Field>

        <form.Field name="filtro">
          {(field) => (
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor={field.name}>Instrumento</FieldLabel>
              <ComboboxField
                items={instrumentoItems}
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value ?? "")}
              >
                <ComboboxFieldTrigger id={field.name} size="sm" className="w-full">
                  <ComboboxFieldValue placeholder="Todos" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  <ComboboxGroup>
                    <ComboboxFieldItem value={ALL_VALUE}>Todos</ComboboxFieldItem>
                    {INSTRUMENTO_OPTIONS.map((option) => (
                      <ComboboxFieldItem key={option.value} value={option.value}>
                        {option.label}
                      </ComboboxFieldItem>
                    ))}
                  </ComboboxGroup>
                </ComboboxFieldContent>
              </ComboboxField>
            </Field>
          )}
        </form.Field>
      </div>
    </form>
  )
}
