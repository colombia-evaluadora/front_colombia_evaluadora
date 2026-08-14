import { useState } from "react"
import { CaretDownIcon } from "@/components/ui/icons"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type {
  RatingSymbol,
  RatingSymbolCategory,
} from "@/features/establishment/academic-period/api/types/rating-scales"

const CATEGORY_LABELS: Record<RatingSymbolCategory, string> = {
  carita: "Símbolo calificación por carita",
  valoracion: "Símbolo calificación por valoración",
}

const CATEGORY_ORDER: RatingSymbolCategory[] = ["carita", "valoracion"]

// Un símbolo es imagen si su valor es un data URI, apunta a una URL/ruta o
// termina en una extensión de imagen; si no, se trata como emoji (texto). Así
// el mismo componente sirve para los emojis de hoy y las imágenes reales del
// futuro (el backend devuelve base64 en `data:image/...`).
function isImageValue(value: string): boolean {
  return (
    /^data:image\//i.test(value) ||
    /^(https?:)?\/\//.test(value) ||
    value.startsWith("/") ||
    /\.(png|jpe?g|svg|webp|gif|avif)$/i.test(value)
  )
}

export function RatingSymbolView({
  value,
  label,
  className,
}: {
  value: string
  label?: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  if (!value) return null

  if (isImageValue(value)) {
    // Si la imagen no carga (404, ruta rota), el alt largo del navegador
    // desborda la celda; mostramos una "x" con el label accesible en su lugar.
    if (failed) {
      return (
        <span
          role="img"
          aria-label={label}
          title={label}
          className={cn(
            "text-muted-foreground inline-flex size-6 items-center justify-center leading-none",
            className,
          )}
        >
          ✕
        </span>
      )
    }

    return (
      <img
        src={value}
        alt={label ?? ""}
        onError={() => setFailed(true)}
        className={cn("inline-block size-6 object-contain", className)}
      />
    )
  }

  return (
    <span role="img" aria-label={label} className={cn("inline-block leading-none", className)}>
      {value}
    </span>
  )
}

// Select con la estética del design system (trigger subrayado, esquinas
// rectas) que despliega el grid de símbolos en un popover al hacer clic.
export function RatingSymbolSelect({
  id,
  symbols,
  value,
  onChange,
  invalid,
  placeholder = "Seleccionar",
}: {
  id?: string
  symbols: RatingSymbol[]
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = symbols.find((symbol) => symbol.valor === value)
  const resolvedVariant = useInputVariant()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            aria-invalid={invalid}
            className={cn(
              inputVariants({ variant: resolvedVariant }),
              inputTriggerVariants({ variant: resolvedVariant }),
              "flex items-center justify-between gap-1.5 text-left",
              resolvedVariant === "outlined" && "bg-background",
            )}
          />
        }
      >
        <span className="flex flex-1 items-center gap-2">
          {selected ? (
            <RatingSymbolView value={selected.valor} label={selected.label} className="text-lg" />
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <CaretDownIcon className="text-muted-foreground size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-72">
        <RatingSymbolPicker
          symbols={symbols}
          value={value}
          onChange={(valor) => {
            onChange(valor)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

// Tamaño de la grilla por categoría. Las caritas vienen ordenadas por
// (escala emocional, color) así que cada fila natural del grid coincide con
// un color; las letras son una sola fila.
const CATEGORY_GRID_COLS: Record<RatingSymbolCategory, string> = {
  carita: "grid-cols-8",
  valoracion: "grid-cols-7",
}

export function RatingSymbolPicker({
  symbols,
  value,
  onChange,
  className,
}: {
  symbols: RatingSymbol[]
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {CATEGORY_ORDER.map((categoria) => {
        const items = symbols.filter((s) => s.categoria === categoria)
        if (items.length === 0) return null

        return (
          <div key={categoria} className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              {CATEGORY_LABELS[categoria]}
            </span>
            {/* Grilla plana: el orden del catálogo (por color para caritas,
                por letra para valoraciones) hace que las filas se "armen"
                solas sin subtítulos. */}
            <div className={cn("grid gap-2", CATEGORY_GRID_COLS[categoria])}>
              {items.map((symbol) => {
                const selected = symbol.valor === value
                return (
                  <button
                    key={symbol.id}
                    type="button"
                    title={symbol.label}
                    aria-pressed={selected}
                    onClick={() => onChange(symbol.valor)}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-none border text-xl transition-colors",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-input hover:bg-foreground/10",
                    )}
                  >
                    <RatingSymbolView value={symbol.valor} label={symbol.label} />
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
