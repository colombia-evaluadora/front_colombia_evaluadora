import { useMemo, useState } from "react"
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
import { VIEW_OPTIONS } from "@/features/planeador/components/view-options"
import {
  PlaneadorAlcanceFields,
  type PlaneadorAlcanceSeleccion,
} from "@/features/planeador/components/planeador-docente-selector"

/** Valor de la opción "Todos": el filtro vacío. */
const ALL_VALUE = ""

interface FilterPlaneadorFormProps {
  id: string
  defaultValues: PlaneadorFiltersFormInput
  onSubmit: (values: PlaneadorFiltersFormValues, alcance?: PlaneadorAlcanceSeleccion) => void
  /** Sede/año/jornada/docente vigentes. Sin esto (docente puro) el form no
   *  muestra esos campos y no los toca al aplicar. */
  alcanceInicial?: PlaneadorAlcanceSeleccion
  // Catálogo `INSTRUMENTO_EVALUACION` (`TLISTA_VALOR`) — nombre y valor son
  // el mismo string, ver `use-instrumento-evaluacion-catalog.ts`. Opcional:
  // la pestaña "Unidad temática" comparte este form pero no tiene
  // instrumento que filtrar.
  instrumentoOptions?: string[]
  /** Rótulo real (Regla 13) para la opción "Actividad" de "Ver por". */
  rotuloLabel: string
  /** Rótulo de la unidad para la opción "Unidad" de "Ver por" (ver
   *  `SearchPlaneador`). */
  rotuloUnidad?: string
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
  instrumentoOptions = [],
  rotuloLabel,
  rotuloUnidad,
  alcanceInicial,
}: FilterPlaneadorFormProps) {
  // Borrador de la cascada Sede → Año → Jornada → Docente: fuera del form de
  // TanStack porque son números con dependencias entre sí, no strings libres.
  const [alcance, setAlcance] = useState<PlaneadorAlcanceSeleccion>(alcanceInicial ?? {})
  const form = useForm({
    defaultValues,
    validators: { onSubmit: planeadorFiltersFormSchema },
    onSubmit: ({ value }) => onSubmit(value, alcanceInicial ? alcance : undefined),
  })

  const estadoItems = useMemo<Record<string, string>>(
    () => Object.fromEntries(ESTADO_OPTIONS.map((o) => [o.value, o.label])),
    [],
  )
  const instrumentoItems = useMemo<Record<string, string>>(
    () => Object.fromEntries(instrumentoOptions.map((nombre) => [nombre, nombre])),
    [instrumentoOptions],
  )
  // Rótulo real (Regla 13) en vez del literal "Actividad" — el caller ya
  // resuelve si todas las filas filtradas comparten uno.
  // Ídem para "Unidad" con el rótulo de la pestaña de Unidades, cuando el
  // caller lo conoce.
  const vistaLabel = (o: (typeof VIEW_OPTIONS)[number]): string =>
    o.value === "actividad" ? rotuloLabel : o.value === "unidad" && rotuloUnidad ? rotuloUnidad : o.label
  const vistaItems: Record<string, string> = Object.fromEntries(VIEW_OPTIONS.map((o) => [o.value, vistaLabel(o)]))

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-1 flex-col gap-5 px-4"
    >
      {alcanceInicial && <PlaneadorAlcanceFields value={alcance} onChange={setAlcance} />}

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
                  <ComboboxFieldValue placeholder={rotuloLabel} />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  <ComboboxGroup>
                    <ComboboxFieldItem value={ALL_VALUE}>{rotuloLabel}</ComboboxFieldItem>
                    {VIEW_OPTIONS.filter((o) => o.value !== "actividad").map((option) => (
                      <ComboboxFieldItem key={option.value} value={option.value}>
                        {vistaLabel(option)}
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
                    {instrumentoOptions.map((nombre) => (
                      <ComboboxFieldItem key={nombre} value={nombre}>
                        {nombre}
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
