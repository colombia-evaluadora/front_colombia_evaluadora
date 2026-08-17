/**
 * Convención única para pasar una respuesta de catálogo a un `<Select>`: el
 * `value` es el `id` — lo que de verdad identifica la fila en la base —, el
 * `label` es el `name`. Nunca el `code`: ese es solo un dato más del
 * catálogo, no un identificador para mandar de vuelta al backend.
 *
 * El parámetro pide solo `{id, name}` (no `CatalogItem` completo) para que
 * sirva también con formas más chicas que comparten esas dos claves —
 * `EstablishmentOption`, `Campus`, filas de catálogos "propios" (roles,
 * municipios, discapacidades, etc.) — sin forzarlas a llevar un `code` que
 * no tienen.
 */
export interface SelectOption<TValue> {
  value: TValue
  label: string
}

interface IdNamed {
  id: number
  name: string
}

/** Para un `<Select>` de formulario normal — `value` numérico. */
export function toSelectOptions(items: IdNamed[]): SelectOption<number>[] {
  return items.map((item) => ({ value: item.id, label: item.name }))
}

/**
 * Para los filtros de la barra de búsqueda (`optionsTerm`/`QueryOption`):
 * esa sintaxis solo admite valores de texto (viven en el input como
 * `clave:(valor)`), así que acá el `id` va como string. El texto que
 * termina viéndose en la barra sigue siendo el `label` — `optionsTerm` lo
 * resuelve solo, no hace falta nada más para que sea legible.
 */
export function toSearchOptions(items: IdNamed[]): SelectOption<string>[] {
  return items.map((item) => ({ value: String(item.id), label: item.name }))
}

/**
 * El `<Select>` compartido (`ui/select.tsx`) solo resuelve la etiqueta del
 * valor elegido cuando `items` es un `Record<value, label>` — un *array*
 * de `{value, label}` (lo que devuelven `toSelectOptions`/`toSearchOptions`,
 * y lo que hace falta para iterar `<SelectItem>`) lo pasa tal cual a Base UI
 * y el trigger se queda sin poder mostrar el label (cae al valor crudo o al
 * placeholder). Por eso todo `<Select items={...}>` necesita este mapa
 * además del array — el array sigue sirviendo para pintar las opciones.
 */
export function toSelectItemsMap<TValue extends string | number>(
  options: SelectOption<TValue>[],
): Record<string, string> {
  return Object.fromEntries(options.map((option) => [String(option.value), option.label]))
}
