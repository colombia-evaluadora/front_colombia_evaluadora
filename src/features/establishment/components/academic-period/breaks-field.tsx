import { useState } from "react"
import { CaretDownIcon, PlusIcon, TrashIcon } from "@/components/ui/icons"

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
        <span className="truncate">
          {value.length > 0 ? `${value.length} descanso(s)` : "Agregar"}
        </span>
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
