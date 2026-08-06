import { useState } from "react"

import { useForm } from "@tanstack/react-form"
import {
  ControlPointIcon,
  PencilIcon,
  PlusCircleIcon,
  TrashIcon,
  XIcon,
  SpinnerIcon,
} from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"

import {
  FIELD_FILTER_CONDITION_LABELS,
  FIELD_FILTER_CONDITIONS,
  tableOperationsFiltersFormSchema,
  type FieldFilter,
  type FieldFilterCondition,
  type TableOperationsFiltersFormInput,
  type TableOperationsFiltersFormValues,
} from "../../api/schema"
import type { OperationType } from "../../api/types/audit-table"
import { useAuditOperationTypesQuery } from "../../api/query/use-audit-operation-types-query"
import { formatDateTimeValue, parseDateTimeValue } from "@/lib/date-time-value"

interface FilterTableOperationsFormProps {
  id: string
  defaultValues: TableOperationsFiltersFormInput
  onSubmit: (values: TableOperationsFiltersFormValues) => void
  // El input de autor vive en el buscador del InputGroup; cuando `hideAuthor`
  // es `true` se omite del form del popover y se conserva como "search".
  availableFields: string[]
  hideAuthor?: boolean
}

export function FilterTableOperationsForm({
  id,
  defaultValues,
  onSubmit,
  availableFields,
  hideAuthor = false,
}: FilterTableOperationsFormProps) {
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: tableOperationsFiltersFormSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit(tableOperationsFiltersFormSchema.parse(value))
    },
  })

  // Las opciones de tipo de operación las entrega el backend como
  // `{ key, label }`.
  const { data: operationOptions = [], isPending: isLoadingOperations } =
    useAuditOperationTypesQuery()

  // Ícono estable por tipo de operación — la lista viene del back, así que
  // resolvemos el ícono contra el `key` (no contra el label).
  function iconFor(operation: OperationType) {
    if (operation === "INSERT") return PlusCircleIcon
    if (operation === "UPDATE") return PencilIcon
    return TrashIcon
  }

  // Las secciones se apilan en el orden en que se usan —operación, luego el
  // rango de fechas, luego los filtros por campo— y cada una reparte sus
  // propios controles en columnas. Así el recorrido es vertical y corto en vez
  // de una sola fila larga que obliga a barrer la pantalla de lado a lado.
  //
  // El scroll no vive acá sino en el contenedor de arriba: con `overflow` en
  // el form este se volvía su propio contexto de recorte y, al no tener
  // padding vertical, cortaba el ring de foco del último control.
  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-1 flex-col gap-5 px-4"
    >
      {!hideAuthor && (
        <form.Field
          name="author"
          children={(field) => (
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor={field.name}>Autor / IP</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="text"
                autoComplete="off"
                placeholder="Ingresar autor o IP"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className="h-9"
              />
            </Field>
          )}
        />
      )}

      <form.Field
        name="operations"
        mode="array"
        children={(field) => {
          const toggle = (operation: OperationType, checked: boolean) => {
            if (checked) {
              field.pushValue(operation)
            } else {
              const index = field.state.value.indexOf(operation)
              if (index > -1) field.removeValue(index)
            }
          }
          return (
            <FieldSet>
              <FieldLegend variant="label">Operación</FieldLegend>
              {isLoadingOperations ? (
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <SpinnerIcon className="size-3 animate-spin" />
                  Cargando tipos de operación…
                </div>
              ) : (
                <FieldGroup className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {operationOptions.map((option) => {
                    const id = `operation-filter-${option.key.toLowerCase()}`
                    const Icon = iconFor(option.key)
                    return (
                      // `Label` pelado y no `FieldLabel`: este es el único
                      // label del form que no cuelga de un `Field` propio, así
                      // que `FieldLabel` iba a buscar el variant al contexto
                      // más cercano… y lo encontraba fuera del popover, en el
                      // `Field variant="outlined"` del buscador (el contexto de
                      // React atraviesa el portal del popover). Resultado: los
                      // tres checkboxes se pintaban como etiqueta flotante
                      // absoluta, apilados en la esquina del panel.
                      <Label key={option.key} htmlFor={id} className="w-full min-w-0">
                        <Field orientation="horizontal">
                          <Checkbox
                            id={id}
                            name={field.name}
                            checked={field.state.value.includes(option.key)}
                            onCheckedChange={(checked) => toggle(option.key, checked === true)}
                          />
                          <FieldContent className="min-w-0">
                            <FieldTitle className="w-full min-w-0">
                              <Icon className="size-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">{option.label}</span>
                            </FieldTitle>
                          </FieldContent>
                        </Field>
                      </Label>
                    )
                  })}
                </FieldGroup>
              )}
            </FieldSet>
          )
        }}
      />

      {/* Dos campos independientes (no un único rango) — cada uno usa el
          modo `datetime`, que combina calendario y hora en el mismo popover
          para no tener que abrir dos controles distintos. Van juntos bajo un
          mismo título porque se leen como un intervalo. */}
      <FieldSet>
        <FieldLegend variant="label">Rango de fecha</FieldLegend>
        <div className="grid grid-cols-2 gap-3">
          <form.Field
            name="occurredFrom"
            children={(field) => (
              <Field orientation="vertical" variant="outlined" className="gap-2">
                <FieldLabel htmlFor={field.name}>Desde</FieldLabel>
                <DatePicker
                  mode="datetime"
                  id={field.name}
                  value={parseDateTimeValue(field.state.value)}
                  onChange={(date) => field.handleChange(formatDateTimeValue(date))}
                  className="h-9"
                />
              </Field>
            )}
          />
          <form.Field
            name="occurredTo"
            children={(field) => (
              <Field orientation="vertical" variant="outlined" className="gap-2">
                <FieldLabel htmlFor={field.name}>Hasta</FieldLabel>
                <DatePicker
                  mode="datetime"
                  id={field.name}
                  value={parseDateTimeValue(field.state.value)}
                  onChange={(date) => field.handleChange(formatDateTimeValue(date))}
                  className="h-9"
                />
              </Field>
            )}
          />
        </div>
      </FieldSet>

      <form.Field
        name="fieldFilters"
        mode="array"
        children={(field) => <FieldFilterSection field={field} availableFields={availableFields} />}
      />
    </form>
  )
}

interface FieldFilterSectionProps {
  // El field viene de TanStack Form; usamos solo lo que necesitamos para
  // no atar la sección al tipado del form completo.
  field: {
    state: { value: FieldFilter[] }
    pushValue: (value: FieldFilter) => void
    removeValue: (index: number) => void
  }
  // Campos de la tabla auditada para el dropdown "Campo".
  availableFields: string[]
}

/**
 * Sección "Filtros por campo": lista los filtros ya agregados como chips
 * removibles y expone el composer (Campo / Condición / Valor + Agregar /
 * Cancelar). El composer tiene estado local porque no queremos pushear
 * filtros incompletos al array del form.
 */
function FieldFilterSection({ field, availableFields }: FieldFilterSectionProps) {
  const [composerField, setComposerField] = useState<string>("")
  const [composerCondition, setComposerCondition] = useState<FieldFilterCondition | "">("")
  const [composerValue, setComposerValue] = useState("")

  const composerReady =
    composerField !== "" && composerCondition !== "" && composerValue.trim() !== ""

  function resetComposer() {
    setComposerField("")
    setComposerCondition("")
    setComposerValue("")
  }

  function handleAdd() {
    if (!composerReady) return
    field.pushValue({
      field: composerField,
      condition: composerCondition as FieldFilterCondition,
      value: composerValue.trim(),
    })
    resetComposer()
  }

  return (
    // Fila completa: el composer es Campo → Condición → Valor → Agregar, una
    // secuencia que se lee en horizontal y que apilada obligaba a scrollear.
    <FieldSet>
      <FieldLegend variant="label">Filtros por campo</FieldLegend>
      <FieldGroup className="gap-3">
        {field.state.value.length > 0 && (
          <ul className="flex flex-col gap-2">
            {field.state.value.map((filter, index) => (
              <li
                key={`${filter.field}-${index}`}
                className="bg-muted/40 flex items-center justify-between gap-2 rounded-none border px-3 py-2 text-xs"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{filter.field}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {FIELD_FILTER_CONDITION_LABELS[filter.condition]}{" "}
                  </span>
                  <span className="font-medium">"{filter.value}"</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Quitar filtro ${filter.field}`}
                  onClick={() => field.removeValue(index)}
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* Campo → Condición → Valor → Agregar en una sola línea: es la
            secuencia en la que se arma el filtro y se lee de corrido. */}
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-3">
          <Field variant="outlined" className="gap-2">
            <FieldLabel htmlFor="field-filter-field">Campo</FieldLabel>
            <Select value={composerField} onValueChange={(value) => setComposerField(value ?? "")}>
              <SelectTrigger id="field-filter-field" size="sm" className="w-full">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="field-filter-condition">Condición</FieldLabel>
            <Select
              // `items` le da al trigger el label del valor seleccionado; sin
              // esto SelectValue imprime la clave cruda ("startsWith").
              items={FIELD_FILTER_CONDITION_LABELS}
              value={composerCondition}
              onValueChange={(value) =>
                setComposerCondition((value ?? "") as FieldFilterCondition | "")
              }
            >
              <SelectTrigger id="field-filter-condition" size="sm" className="w-full">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {FIELD_FILTER_CONDITIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {FIELD_FILTER_CONDITION_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="field-filter-value">Valor</FieldLabel>
            <Input
              id="field-filter-value"
              type="text"
              autoComplete="off"
              placeholder="Ingresar texto"
              value={composerValue}
              onChange={(event) => setComposerValue(event.target.value)}
              className="h-9"
            />
          </Field>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!composerReady}
            className="h-9 rounded-full"
          >
            <ControlPointIcon data-icon="inline-start" />
            Agregar
          </Button>
        </div>
      </FieldGroup>
    </FieldSet>
  )
}
