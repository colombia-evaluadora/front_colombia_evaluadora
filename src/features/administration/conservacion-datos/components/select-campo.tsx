import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toSelectItemsMap } from "@/lib/catalog-options"
import { cn } from "@/lib/utils"

/** Valor de "Todos" en los filtros: ningún id ni texto real es vacío. */
const TODOS = "__todos__"

/**
 * Select con etiqueta flotante, como los filtros de Informes. `todos` agrega
 * la opción que limpia el filtro (devuelve ""). `buscable` lo vuelve combobox
 * (se escribe para filtrar), para listas largas como los establecimientos.
 */
export function SelectCampo({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = "Seleccione",
  todos,
  buscable,
  required,
  disabled,
  invalid,
  className,
}: {
  id: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  placeholder?: string
  /** Texto de la opción que limpia el filtro, p. ej. "Todos". */
  todos?: string
  buscable?: boolean
  required?: boolean
  disabled?: boolean
  invalid?: boolean
  className?: string
}) {
  const opciones = todos ? [{ value: TODOS, label: todos }, ...options] : options
  const actual = value === "" ? (todos ? TODOS : null) : value
  const cambiar = (v: unknown) => onChange(v == null || v === TODOS ? "" : String(v))

  return (
    <Field variant="outlined" className={cn("min-w-0", className)} data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? <span className="text-red"> *</span> : null}
      </FieldLabel>
      {buscable ? (
        <ComboboxField items={toSelectItemsMap(opciones)} value={actual} onValueChange={cambiar}>
          <ComboboxFieldTrigger id={id} disabled={disabled} aria-invalid={invalid || undefined} className="w-full">
            <ComboboxFieldValue placeholder={placeholder} />
          </ComboboxFieldTrigger>
          <ComboboxFieldContent>
            {opciones.map((o) => (
              <ComboboxFieldItem key={o.value} value={o.value}>
                {o.label}
              </ComboboxFieldItem>
            ))}
          </ComboboxFieldContent>
        </ComboboxField>
      ) : (
        <Select items={toSelectItemsMap(opciones)} value={actual} onValueChange={cambiar}>
          <SelectTrigger id={id} disabled={disabled} aria-invalid={invalid || undefined} className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {opciones.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  )
}
