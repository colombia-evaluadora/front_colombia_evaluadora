import { useState } from "react"

import { useForm } from "@tanstack/react-form"
import {
  CalendarIcon,
  PencilIcon,
  PlusCircleIcon,
  TrashIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
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

const DATE_FORMAT = "yyyy-MM-dd"

interface FilterTableOperationsFormProps {
  id: string
  defaultValues: TableOperationsFiltersFormInput
  onSubmit: (values: TableOperationsFiltersFormValues) => void
  availableFields: string[]
}

export function FilterTableOperationsForm({
  id,
  defaultValues,
  onSubmit,
  availableFields,
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

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
    >
      <form.Field
        name="author"
        children={(field) => (
          <Field orientation="vertical" className="gap-2">
            <FieldLabel htmlFor={field.name}>Autor / IP</FieldLabel>
            <Input
              id={field.name}
              name={field.name}
              type="text"
              autoComplete="off"
              placeholder="ej. Juan Pérez o 190.2.45.12"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              className="h-9"
            />
          </Field>
        )}
      />

      <Separator />

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
              <FieldGroup className="grid grid-cols-2 gap-3">
                <FieldLabel htmlFor="operation-filter-insert" className="min-w-0">
                  <Field orientation="horizontal">
                    <Checkbox
                      id="operation-filter-insert"
                      name={field.name}
                      checked={field.state.value.includes("INSERT")}
                      onCheckedChange={(checked) =>
                        toggle("INSERT", checked === true)
                      }
                    />
                    <FieldContent className="min-w-0">
                      <FieldTitle className="w-full min-w-0">
                        <PlusCircleIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">Insert</span>
                      </FieldTitle>
                    </FieldContent>
                  </Field>
                </FieldLabel>
                <FieldLabel htmlFor="operation-filter-update" className="min-w-0">
                  <Field orientation="horizontal">
                    <Checkbox
                      id="operation-filter-update"
                      name={field.name}
                      checked={field.state.value.includes("UPDATE")}
                      onCheckedChange={(checked) =>
                        toggle("UPDATE", checked === true)
                      }
                    />
                    <FieldContent className="min-w-0">
                      <FieldTitle className="w-full min-w-0">
                        <PencilIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">Update</span>
                      </FieldTitle>
                    </FieldContent>
                  </Field>
                </FieldLabel>
                <FieldLabel htmlFor="operation-filter-delete" className="min-w-0">
                  <Field orientation="horizontal">
                    <Checkbox
                      id="operation-filter-delete"
                      name={field.name}
                      checked={field.state.value.includes("DELETE")}
                      onCheckedChange={(checked) =>
                        toggle("DELETE", checked === true)
                      }
                    />
                    <FieldContent className="min-w-0">
                      <FieldTitle className="w-full min-w-0">
                        <TrashIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">Delete</span>
                      </FieldTitle>
                    </FieldContent>
                  </Field>
                </FieldLabel>
              </FieldGroup>
            </FieldSet>
          )
        }}
      />

      <Separator />

      <form.Field
        name="occurredFrom"
        children={(fromField) => (
          <form.Field
            name="occurredTo"
            children={(toField) => {
              const range: DateRange | undefined = fromField.state.value
                ? {
                    from: parseISO(fromField.state.value),
                    to: toField.state.value
                      ? parseISO(toField.state.value)
                      : undefined,
                  }
                : undefined

              const label = range?.from
                ? range.to
                  ? `${format(range.from, "d MMM", { locale: es })} – ${format(range.to, "d MMM yyyy", { locale: es })}`
                  : format(range.from, "d MMM yyyy", { locale: es })
                : "Rango de fechas"

              const handleSelect = (next: DateRange | undefined) => {
                fromField.handleChange(next?.from ? format(next.from, DATE_FORMAT) : "")
                toField.handleChange(next?.to ? format(next.to, DATE_FORMAT) : "")
              }

              return (
                <Field orientation="vertical" className="gap-2">
                  <FieldLabel>Fecha (rango)</FieldLabel>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start font-normal"
                        />
                      }
                    >
                      <CalendarIcon data-icon="inline-start" />
                      {label}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={range}
                        onSelect={handleSelect}
                        locale={es}
                        numberOfMonths={1}
                      />
                      {range?.from && (
                        <div className="border-t p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => handleSelect(undefined)}
                          >
                            Limpiar rango
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </Field>
              )
            }}
          />
        )}
      />

      <Separator />

      <form.Field
        name="fieldFilters"
        mode="array"
        children={(field) => (
          <FieldFilterSection field={field} availableFields={availableFields} />
        )}
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
  const [composerCondition, setComposerCondition] = useState<
    FieldFilterCondition | ""
  >("")
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

        <Field orientation="vertical" className="gap-2">
          <FieldLabel htmlFor="field-filter-field">Campo</FieldLabel>
          <Select
            value={composerField}
            onValueChange={(value) => setComposerField(value ?? "")}
          >
            <SelectTrigger id="field-filter-field" size="sm" className="w-full">
              <SelectValue placeholder="Elegí un campo de la tabla" />
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

        <Field orientation="vertical" className="gap-2">
          <FieldLabel htmlFor="field-filter-condition">Condición</FieldLabel>
          <Select
            value={composerCondition}
            onValueChange={(value) =>
              setComposerCondition((value ?? "") as FieldFilterCondition | "")
            }
          >
            <SelectTrigger
              id="field-filter-condition"
              size="sm"
              className="w-full"
            >
              <SelectValue placeholder="Elegí cómo comparar" />
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

        <Field orientation="vertical" className="gap-2">
          <FieldLabel htmlFor="field-filter-value">Valor</FieldLabel>
          <Input
            id="field-filter-value"
            type="text"
            autoComplete="off"
            placeholder="Escribí el texto a buscar…"
            value={composerValue}
            onChange={(event) => setComposerValue(event.target.value)}
            className="h-9"
          />
        </Field>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!composerReady}
          >
            <PlusIcon data-icon="inline-start" weight="bold" />
            Agregar
          </Button>
      </FieldGroup>
    </FieldSet>
  )
}
