import { useState } from "react"
import { CaretDownIcon, PlusIcon, TrashIcon, XIcon } from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import {
  inputTriggerVariants,
  inputVariants,
  useInputVariant,
} from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TimePickerPanel } from "@/components/ui/time-picker"
import { cn } from "@/lib/utils"

export type Break = { startTime: string; endTime: string }

function formatTime12(value: string): string {
  if (!value) return ""
  const [h, m] = value.split(":").map(Number)
  const period = h < 12 ? "am" : "pm"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, "0")}${period}`
}

// Inicio del chip: "Ha" / "Hp" — solo la hora + letra del período.
// Ej.: 5:00am → "5a".
function formatBreakStartLabel(value: string): string {
  if (!value) return ""
  const [h] = value.split(":").map(Number)
  const period = h < 12 ? "a" : "p"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}${period}`
}

// Fin del chip: "H:3a" / "H:3p" — hora + marcador "3" + letra del período.
// El "3" es fijo (no se calcula del minuto) para mantener el formato
// compacto que pide la UI.
function formatBreakEndLabel(value: string): string {
  if (!value) return ""
  const [h] = value.split(":").map(Number)
  const period = h < 12 ? "a" : "p"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:3${period}`
}

// Render del trigger: hasta 2 chips con "Ha → H:3a" + × para borrar.
// Si hay más de 2, agrega un chip "+1" al final.
function BreakChips({
  value,
  onRemove,
}: {
  value: Break[]
  onRemove: (index: number) => void
}) {
  const visible = value.slice(0, 2)
  const extra = value.length - visible.length

  return (
    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
      {visible.map((brk, index) => (
        <span
          key={`${brk.startTime}-${brk.endTime}-${index}`}
          className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
        >
          <span className="font-medium">
            {formatBreakStartLabel(brk.startTime)} → {formatBreakEndLabel(brk.endTime)}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(index)
            }}
            aria-label={`Quitar descanso ${index + 1}`}
            className="hover:text-foreground -mr-1 inline-flex items-center"
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      {extra > 0 && (
        <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2 py-0.5 text-xs">
          +1
        </span>
      )}
    </span>
  )
}

export function BreaksField({
  value,
  onAdd,
  onRemove,
}: {
  value: Break[]
  onAdd: (brk: Break) => void
  onRemove: (index: number) => void
}) {
  const resolvedVariant = useInputVariant()

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              inputVariants({ variant: resolvedVariant }),
              inputTriggerVariants({ variant: resolvedVariant }),
              "flex items-center justify-between gap-1.5 text-left",
              value.length === 0 && "text-muted-foreground"
            )}
          />
        }
      >
        {value.length === 0 ? (
          <span>Agregar</span>
        ) : (
          <BreakChips value={value} onRemove={onRemove} />
        )}
        <CaretDownIcon className="text-muted-foreground size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-72">
        <div className="flex flex-col gap-3">
          <BreakEditor onAdd={onAdd} />

          {value.length > 0 && (
            <ul className="flex flex-col">
              {value.map((brk, index) => (
                <li
                  key={`${brk.startTime}-${brk.endTime}-${index}`}
                  className="flex items-center justify-between gap-4 border-t py-1 text-sm first:border-t-0"
                >
                  <span>
                    {formatTime12(brk.startTime)} → {formatTime12(brk.endTime)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Quitar descanso ${index + 1}`}
                    onClick={() => onRemove(index)}
                  >
                    <TrashIcon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function BreakEditor({ onAdd }: { onAdd: (brk: Break) => void }) {
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")

  return (
    <div className="flex w-full items-center gap-2">
      <div className="border-input flex flex-1 items-center gap-3 border px-2 py-1">
        <BreakTimeTrigger
          value={startTime}
          onChange={setStartTime}
          placeholder="Hora inicio"
        />
        <span className="text-muted-foreground shrink-0 text-xs">→</span>
        <BreakTimeTrigger
          value={endTime}
          onChange={setEndTime}
          placeholder="Hora Final"
        />
      </div>
      <Button
        type="button"
        color="primary"
        size="icon"
        aria-label="Agregar descanso"
        disabled={!startTime || !endTime}
        onClick={() => {
          onAdd({ startTime, endTime })
          setStartTime("")
          setEndTime("")
        }}
      >
        <PlusIcon weight="bold" />
      </Button>
    </div>
  )
}

function BreakTimeTrigger({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "min-w-0 flex-1 whitespace-nowrap text-left text-sm outline-none",
              value ? "text-foreground font-medium" : "text-muted-foreground"
            )}
          />
        }
      >
        {value ? formatTime12(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <TimePickerPanel value={value || undefined} onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}
