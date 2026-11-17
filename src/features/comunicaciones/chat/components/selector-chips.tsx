import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import { CaretDownIcon, CheckIcon, XIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

const CHIP =
  "inline-flex h-7 max-w-full min-w-0 items-center rounded-full border bg-muted/40 px-3 text-sm font-normal text-muted-foreground"

// Selección múltiple con chips. Muestra los chips que caben en una línea (o
// `visibles` como tope) y el resto como "+N" para que el campo no crezca. El popup es claro, como los menús del chat
// (el de ui/combobox es oscuro).
export function SelectorChips<T>({
  items,
  value,
  onChange,
  getId,
  getLabel,
  filtrar,
  renderItem,
  visibles,
  cargando,
  placeholder,
  ariaLabel,
  vacio = "Nada coincide con la búsqueda.",
  invalido,
  autoFocus,
  conFlecha,
  onConsulta,
  soloConConsulta,
  deshabilitado,
}: {
  items: T[]
  value: T[]
  onChange: (v: T[]) => void
  getId: (item: T) => string | number
  getLabel: (item: T) => string
  filtrar?: (item: T, consulta: string) => boolean
  renderItem?: (item: T) => ReactNode
  // Máximo de chips a la vista; sin valor, los que quepan en la línea.
  visibles?: number
  cargando?: boolean
  placeholder?: string
  ariaLabel: string
  // null: sin coincidencias no se abre la lista.
  vacio?: string | null
  // Texto escrito en el buscador, para filtrar otra lista con la misma consulta.
  onConsulta?: (consulta: string) => void
  // Sin texto escrito no se sugiere nada.
  soloConConsulta?: boolean
  // Se muestran pero no se pueden elegir (p. ej. quien ya está en el canal).
  deshabilitado?: (item: T) => boolean
  invalido?: boolean
  autoFocus?: boolean
  conFlecha?: boolean
}) {
  const anchor = useComboboxAnchor()
  const medidas = useRef<HTMLDivElement | null>(null)
  const flecha = useRef<HTMLButtonElement | null>(null)
  const [caben, setCaben] = useState(value.length)

  /**
   * Cuántos chips caben en una línea. Se miden todos en una fila invisible
   * (`medidas`) y se suman contra el ancho útil del campo, descontando la
   * flecha, el mínimo del buscador (`min-w-16` del input) y, si sobran chips,
   * el "+N". Así el "+N" solo aparece cuando el campo está lleno; antes salía
   * desde el segundo chip aunque hubiera espacio.
   */
  useLayoutEffect(() => {
    const campo = anchor.current
    const fila = medidas.current
    if (!campo || !fila) return
    const calcular = () => {
      const estilo = getComputedStyle(campo)
      const gap = parseFloat(estilo.columnGap) || 0
      const util =
        campo.clientWidth -
        parseFloat(estilo.paddingLeft) -
        parseFloat(estilo.paddingRight) -
        (flecha.current ? flecha.current.offsetWidth + gap : 0) -
        (64 + gap)
      const chips = Array.from(fila.children) as HTMLElement[]
      const mas = chips.pop()?.offsetWidth ?? 0
      let usado = 0
      let n = 0
      for (let i = 0; i < chips.length; i++) {
        const quedan = chips.length - (i + 1)
        const reserva = quedan > 0 ? mas + gap : 0
        if (usado + chips[i].offsetWidth + gap + reserva > util) break
        usado += chips[i].offsetWidth + gap
        n++
      }
      // Al menos uno: un nombre largo se recorta (`truncate`) antes que desaparecer.
      setCaben(Math.max(1, n))
    }
    calcular()
    const observer = new ResizeObserver(calcular)
    observer.observe(campo)
    return () => observer.disconnect()
  }, [anchor, value, getLabel])

  const limite = Math.min(caben, visibles ?? Infinity)
  const mostrados = value.slice(0, limite)
  const resto = value.slice(limite)

  return (
    <Combobox
      items={items}
      multiple
      value={value}
      onValueChange={(v: T[]) => onChange(v)}
      itemToStringLabel={getLabel}
      onInputValueChange={(v: string) => onConsulta?.(v)}
      isItemEqualToValue={(a: T, b: T) => getId(a) === getId(b)}
      filter={(item: T, q: string) => {
        const t = q.trim().toLowerCase()
        if (!t) return !soloConConsulta
        return (filtrar ? filtrar(item, t) : getLabel(item).toLowerCase().includes(t))
      }}
    >
      <ComboboxChips
        ref={anchor}
        aria-invalid={invalido || undefined}
        className={cn(
          "relative min-h-10 w-full min-w-0 gap-2 rounded-sm border border-input px-3 py-2 focus-within:border-primary has-data-[slot=combobox-chip]:px-3",
          invalido && "border-red",
        )}
      >
        {/* Fila de medición: todos los chips más un "+N" de muestra, invisibles. */}
        <div
          ref={medidas}
          aria-hidden
          className="pointer-events-none invisible absolute top-0 left-0 flex w-max gap-2 whitespace-nowrap"
        >
          {value.map((item) => (
            // Mismo ancho que `ComboboxChip`: texto + botón X (`icon-xs`, `-ml-1`, `pr-0`).
            <span key={getId(item)} className={cn(CHIP, "gap-1 pr-0")}>
              {getLabel(item)}
              <span className="-ml-1 size-7 shrink-0" />
            </span>
          ))}
          <span className={cn(CHIP, "gap-1 pr-1")}>
            +{value.length}
            <span className="size-5" />
          </span>
        </div>
        <ComboboxValue>
          {() => (
            <>
              {mostrados.map((item) => (
                <ComboboxChip key={getId(item)} className={CHIP} aria-label={getLabel(item)} title={getLabel(item)}>
                  {/* Un nombre largo se recorta en vez de salirse de la columna. */}
                  <span className="min-w-0 truncate">{getLabel(item)}</span>
                </ComboboxChip>
              ))}
              {resto.length > 0 && (
                <span className={cn(CHIP, "gap-1 pr-1")} title={resto.map(getLabel).join(", ")}>
                  +{resto.length}
                  <button
                    type="button"
                    aria-label={`Quitar ${resto.length} más`}
                    onClick={() => onChange(mostrados)}
                    className="grid size-5 place-items-center rounded-full text-current focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
            </>
          )}
        </ComboboxValue>
        <ComboboxChipsInput
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          placeholder={value.length ? "" : placeholder}
          className="text-sm placeholder:text-muted-foreground"
        />
        {conFlecha && (
          <ComboboxPrimitive.Trigger
            ref={flecha}
            aria-label={`Ver opciones de ${ariaLabel.toLowerCase()}`}
            className="ml-auto grid size-6 place-items-center rounded text-muted-foreground hover:text-foreground"
          >
            <CaretDownIcon className="size-5" />
          </ComboboxPrimitive.Trigger>
        )}
      </ComboboxChips>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner anchor={anchor} sideOffset={6} align="start" className="isolate z-50">
          <ComboboxPrimitive.Popup className={cn(
              "w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md duration-100 data-closed:animate-out data-closed:fade-out-0 data-open:animate-in data-open:fade-in-0",
              vacio === null && !cargando && "has-data-empty:hidden",
            )}
          >
            <ComboboxPrimitive.Empty className="px-3 py-2.5 text-sm text-muted-foreground empty:hidden">
              {cargando ? "Cargando…" : vacio}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain p-1 data-empty:p-0">
              {(item: T) => (
                <ComboboxPrimitive.Item
                  key={getId(item)}
                  value={item}
                  disabled={deshabilitado?.(item)}
                  className="flex cursor-default items-center gap-3 rounded-md px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-primary/10 data-selected:bg-muted/50 data-disabled:cursor-not-allowed"
                >
                  <span className="min-w-0 flex-1">{renderItem ? renderItem(item) : getLabel(item)}</span>
                  <ComboboxPrimitive.ItemIndicator className="text-primary">
                    <CheckIcon className="size-4" />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </Combobox>
  )
}
