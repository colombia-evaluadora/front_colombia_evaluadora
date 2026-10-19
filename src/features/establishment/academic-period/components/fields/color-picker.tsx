"use client"

import { useState } from "react"

import { CheckIcon } from "@/components/ui/icons"
import { Input, inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function isHex(value: string): boolean {
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
}

function withHash(value: string): string {
  return value.startsWith("#") ? value : `#${value}`
}

function hslToHex(h: number, s: number, l: number): string {
  const sFrac = s / 100
  const lFrac = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sFrac * Math.min(lFrac, 1 - lFrac)
  const f = (n: number) => lFrac - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0")
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

// Cada fila barre el mismo círculo de matices (8 pasos de 45°) a una
// saturación/luminosidad distinta — así cada columna comparte el mismo tono
// y la grilla se lee ordenada en vez de colores sueltos sin relación.
const SWATCH_ROWS = [
  { s: 75, l: 50 },
  { s: 70, l: 60 },
  { s: 65, l: 75 },
  { s: 50, l: 85 },
]
const SWATCHES: string[] = SWATCH_ROWS.flatMap(({ s, l }) =>
  Array.from({ length: 8 }, (_, i) => hslToHex(i * 45, s, l)),
)

interface ColorPickerProps {
  value?: string
  onChange: (hex: string) => void
  className?: string
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const selectedHex = value && isHex(value) ? withHash(value).toLowerCase() : undefined
  const [hexText, setHexText] = useState(value ? withHash(value) : "")

  function pick(hex: string) {
    setHexText(hex)
    onChange(hex)
  }

  function onHexChange(raw: string) {
    setHexText(raw)
    if (isHex(raw)) onChange(withHash(raw))
  }

  return (
    <div className={cn("flex w-64 flex-col gap-3", className)}>
      <div className="grid grid-cols-8 gap-1.5">
        {SWATCHES.map((swatch) => {
          const selected = selectedHex === swatch
          return (
            <button
              key={swatch}
              type="button"
              title={swatch}
              aria-label={swatch}
              aria-pressed={selected}
              onClick={() => pick(swatch)}
              className="flex size-7 items-center justify-center rounded-none border border-foreground/10"
              style={{ backgroundColor: swatch }}
            >
              {selected && <CheckIcon weight="bold" className="size-4 text-white drop-shadow" />}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <span
          className="size-8 shrink-0 rounded-none ring-1 ring-foreground/10"
          style={{ backgroundColor: isHex(hexText) ? withHash(hexText) : "transparent" }}
        />
        <Input
          value={hexText}
          onChange={(e) => onHexChange(e.target.value)}
          spellCheck={false}
          aria-label="Código hexadecimal"
          placeholder="Otro color (hex)"
          className="h-8"
        />
      </div>
    </div>
  )
}

interface ColorPickerPopoverProps {
  value: string
  onChange: (hex: string) => void
  invalid?: boolean
}

export function ColorPickerPopover({ value, onChange, invalid }: ColorPickerPopoverProps) {
  const [open, setOpen] = useState(false)
  const resolvedVariant = useInputVariant()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Color"
            aria-invalid={invalid}
            className={cn(
              inputVariants({ variant: resolvedVariant }),
              inputTriggerVariants({ variant: resolvedVariant }),
              "flex items-center gap-2 text-left",
              resolvedVariant === "outlined" && "bg-background",
              !value && "text-muted-foreground",
            )}
          />
        }
      >
        {value ? (
          <span
            className="inline-block size-4 rounded-full ring-1 ring-foreground/10"
            style={{ backgroundColor: withHash(value) }}
          />
        ) : (
          <span className="text-muted-foreground">Seleccionar</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <ColorPicker value={value || undefined} onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}
