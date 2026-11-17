import type { InputVariant } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * Select estándar de la app (Base UI) para las pantallas de Comunicaciones, que antes usaban
 * `NativeSelect`: el nativo no respeta `Field variant="outlined"` (quedaba con el texto pegado
 * a la izquierda y una línea abajo). Las opciones conservan el contrato del nativo: el valor
 * `""` sigue significando "Todos" / sin selección. Base UI trata `null` como "sin valor" y no
 * admite un item con `""`, así que se traduce al centinela `__none__` (el mismo que usan
 * planeador y `SelectField`) y se devuelve `""` en `onValueChange`.
 */
export interface OpcionSelect {
  value: string
  label: string
  disabled?: boolean
}

const VACIO = "__none__"
const aSelect = (v: string) => (v === "" ? VACIO : v)
const deSelect = (v: string) => (v === VACIO ? "" : v)

type Comunes = {
  id?: string
  opciones: OpcionSelect[]
  /** Texto cuando no hay valor ni opción "" que lo nombre. */
  placeholder?: string
  disabled?: boolean
  size?: "sm" | "default"
  /** Fuera de un `Field` (etiqueta propia arriba) pasá `"outlined"` para conservar el borde. */
  variant?: InputVariant
  className?: string
  "aria-label"?: string
  "aria-required"?: boolean
}

type Simple = Comunes & { multiple?: false; value: string; onValueChange: (valor: string) => void }
type Multiple = Comunes & { multiple: true; value: string[]; onValueChange: (valores: string[]) => void }

export function SelectOpciones(props: Simple | Multiple) {
  const { id, opciones, placeholder = "Seleccione", disabled, size, variant, className } = props
  const etiquetas = Object.fromEntries(opciones.map((o) => [aSelect(o.value), o.label]))

  const trigger = (
    <SelectTrigger
      id={id}
      size={size}
      variant={variant}
      className={className ?? "w-full"}
      aria-label={props["aria-label"]}
      aria-required={props["aria-required"]}
    >
      {props.multiple ? (
        <SelectValue placeholder={placeholder}>
          {(valores: string[]) =>
            valores?.length ? valores.map((v) => etiquetas[v] ?? v).join(", ") : placeholder
          }
        </SelectValue>
      ) : (
        <SelectValue placeholder={placeholder} />
      )}
    </SelectTrigger>
  )
  const contenido = (
    <SelectContent>
      {opciones.map((o) => (
        <SelectItem key={aSelect(o.value)} value={aSelect(o.value)} disabled={o.disabled}>
          {o.label}
        </SelectItem>
      ))}
    </SelectContent>
  )

  if (props.multiple) {
    const { value, onValueChange } = props
    return (
      <Select<string, true>
        multiple
        value={value}
        disabled={disabled}
        onValueChange={(v) => onValueChange((v ?? []).map(deSelect))}
      >
        {trigger}
        {contenido}
      </Select>
    )
  }

  const { value, onValueChange } = props
  // Valor sin opción que lo represente (p. ej. "" sin opción "Todos") → null muestra el placeholder.
  const actual = etiquetas[aSelect(value ?? "")] !== undefined ? aSelect(value ?? "") : null
  return (
    <Select<string | null>
      items={etiquetas}
      value={actual}
      disabled={disabled}
      onValueChange={(v) => onValueChange(deSelect(v ?? ""))}
    >
      {trigger}
      {contenido}
    </Select>
  )
}
