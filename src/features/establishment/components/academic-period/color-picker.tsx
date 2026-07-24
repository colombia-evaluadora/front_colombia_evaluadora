"use client"

import { useState } from "react"

import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"



// --- Conversiones de color (sin librerías) ---

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function isHex(value: string): boolean {
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "")
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean
  const num = parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, "0")
  return `#${h(r)}${h(g)}${h(b)}`
}

type Hsv = { h: number; s: number; v: number }

function rgbToHsv(r: number, g: number, b: number): Hsv {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

function hexToHsv(hex: string): Hsv {
  return rgbToHsv(...hexToRgb(hex))
}

function hsvToHex(h: number, s: number, v: number): string {
  return rgbToHex(...hsvToRgb(h, s, v))
}

function beginDrag(
  el: HTMLElement,
  clientX: number,
  clientY: number,
  onMove: (x: number, y: number) => void
) {
  const handle = (cx: number, cy: number) => {
    const rect = el.getBoundingClientRect()
    onMove(
      clamp01((cx - rect.left) / rect.width),
      clamp01((cy - rect.top) / rect.height)
    )
  }
  handle(clientX, clientY)
  const move = (ev: PointerEvent) => handle(ev.clientX, ev.clientY)
  const up = () => {
    window.removeEventListener("pointermove", move)
    window.removeEventListener("pointerup", up)
  }
  window.addEventListener("pointermove", move)
  window.addEventListener("pointerup", up)
}

interface ColorPickerProps {
  value?: string
  onChange: (hex: string) => void
  className?: string
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const initial = value && isHex(value) ? hexToHsv(value) : { h: 0, s: 1, v: 1 }
  const [hsv, setHsv] = useState<Hsv>(initial)
  const [hexText, setHexText] = useState(hsvToHex(initial.h, initial.s, initial.v))

  const hex = hsvToHex(hsv.h, hsv.s, hsv.v)

  function commit(next: Hsv) {
    setHsv(next)
    const nextHex = hsvToHex(next.h, next.s, next.v)
    setHexText(nextHex)
    onChange(nextHex)
  }

  function onSquarePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    beginDrag(e.currentTarget, e.clientX, e.clientY, (x, y) =>
      commit({ h: hsv.h, s: x, v: 1 - y })
    )
  }

  function onHuePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    beginDrag(e.currentTarget, e.clientX, e.clientY, (x) =>
      commit({ h: x * 360, s: hsv.s, v: hsv.v })
    )
  }

  function onHexChange(raw: string) {
    setHexText(raw)
    if (isHex(raw)) {
      const parsed = hexToHsv(raw)
      setHsv(parsed)
      onChange(hsvToHex(parsed.h, parsed.s, parsed.v))
    }
  }

  return (
    <div className={cn("flex w-56 flex-col gap-3", className)}>
      {/* Cuadro saturación / valor */}
      <div
        role="slider"
        aria-label="Saturación y brillo"
        aria-valuetext={hex}
        tabIndex={0}
        onPointerDown={onSquarePointerDown}
        className="relative h-36 w-full cursor-crosshair rounded-none"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${hsv.h}, 100%, 50%)`,
        }}
      >
        <span
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
          }}
        />
      </div>

      {/* Barra de hue */}
      <div
        role="slider"
        aria-label="Matiz"
        aria-valuenow={Math.round(hsv.h)}
        aria-valuemin={0}
        aria-valuemax={360}
        tabIndex={0}
        onPointerDown={onHuePointerDown}
        className="relative h-3 w-full cursor-pointer rounded-full"
        style={{
          background:
            "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
        }}
      >
        <span
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-transparent"
          style={{
            left: `${(hsv.h / 360) * 100}%`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
          }}
        />
      </div>

      {/* Vista previa + hex */}
      <div className="flex items-center gap-2">
        <span
          className="size-8 shrink-0 rounded-none ring-1 ring-foreground/10"
          style={{ backgroundColor: hex }}
        />
        <Input
          value={hexText}
          onChange={(e) => onHexChange(e.target.value)}
          spellCheck={false}
          aria-label="Código hexadecimal"
          className="h-8"
        />
      </div>
    </div>
  )
}

interface ColorPickerPopoverProps {
  value: string
  onChange: (hex: string) => void
}

// Trigger tipo campo (subrayado) que muestra el color elegido y abre el
// picker en un popover.
export function ColorPickerPopover({ value, onChange }: ColorPickerPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Color"
            className="flex h-9 w-full items-center gap-2 rounded-none border border-transparent border-b-input bg-transparent px-0 text-left text-sm outline-none transition-[color,border-color] hover:border-b-ring/50 data-[popup-open]:border-b-ring"
          />
        }
      >
        {value ? (
          <span
            className="inline-block size-4 rounded-full ring-1 ring-foreground/10"
            style={{ backgroundColor: value }}
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
