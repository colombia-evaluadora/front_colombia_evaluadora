import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxSeparator,
} from "@/components/ui/combobox"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useValoresQuery } from "@/features/administration/listas-valor/api/query/use-valores-query"
import type { Categoria } from "@/features/administration/listas-valor/api/types/lista-valor"

// Los `value` de un select son strings; "sin elegir" necesita su propio valor.
export const NONE = "none"

interface CategoriaPadreSelectProps {
  id: string
  value: string
  onChange: (categoria: string) => void
  categorias: Categoria[]
  /** La propia categoría no puede ser su padre. */
  exclude?: string
  disabled?: boolean
}

/** Categoría de la que cuelgan los valores (país → departamento → municipio). */
export function CategoriaPadreSelect({
  id,
  value,
  onChange,
  categorias,
  exclude,
  disabled,
}: CategoriaPadreSelectProps) {
  const opciones = categorias.filter((c) => c.categoria !== exclude)
  // Combobox y no select: hay decenas de listas y se busca escribiendo.
  return (
    <ComboboxField value={value} onValueChange={(next) => next && onChange(String(next))}>
      <ComboboxFieldTrigger id={id} disabled={disabled}>
        <ComboboxFieldValue>
          {(current) => (current === NONE ? "Ninguna" : current)}
        </ComboboxFieldValue>
      </ComboboxFieldTrigger>
      <ComboboxFieldContent>
        <ComboboxFieldItem value={NONE}>Ninguna</ComboboxFieldItem>
        <ComboboxSeparator />
        {opciones.map((c) => (
          <ComboboxFieldItem key={c.categoria} value={c.categoria}>
            <span className="font-mono text-[0.8125rem]">{c.categoria}</span>
          </ComboboxFieldItem>
        ))}
      </ComboboxFieldContent>
    </ComboboxField>
  )
}

interface ValorPadreSelectProps {
  id: string
  /** Categoría padre; sin ella no hay valores que ofrecer. */
  categoria: string | null
  value: string
  onChange: (pk: string) => void
  disabled?: boolean
  "aria-label"?: string
  /** Si la lista tiene lista padre el valor padre es obligatorio: sin la opción "Sin padre". */
  required?: boolean
}

/** Valor padre dentro de la categoría padre. `NONE` = sin padre. */
export function ValorPadreSelect({
  id,
  categoria,
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
  required,
}: ValorPadreSelectProps) {
  const { data: valores = [], isPending } = useValoresQuery(categoria)
  const sinCategoria = !categoria
  return (
    <Select
      value={value}
      onValueChange={(next) => next && onChange(String(next))}
      disabled={disabled || sinCategoria}
    >
      <SelectTrigger id={id} variant="outlined" aria-label={ariaLabel}>
        <SelectValue>
          {(current) => {
            if (current === NONE)
              return sinCategoria ? "Elija la lista padre" : required ? "Seleccione" : "Sin padre"
            const valor = valores.find((v) => String(v.pkListaValor) === current)
            return valor
              ? `${valor.nombre} (${valor.valor})`
              : isPending
                ? "Cargando…"
                : "Seleccione"
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {!required && <SelectItem value={NONE}>Sin padre</SelectItem>}
          {/* Solo habilitados: un inactivo no puede ser padre (V101). */}
          {valores
            .filter((v) => v.habilitado)
            .map((v) => (
              <SelectItem key={v.pkListaValor} value={String(v.pkListaValor)}>
                {v.nombre} ({v.valor})
              </SelectItem>
            ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
