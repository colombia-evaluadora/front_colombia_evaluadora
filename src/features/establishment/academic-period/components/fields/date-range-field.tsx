import { CalendarIcon, ArrowRightIcon } from "@/components/ui/icons"

import { Calendar } from "@/components/ui/calendar"
import { inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type DateRange = { startDate: string; endDate: string }

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseISODate(value: string): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

interface CalendarRange {
  from?: Date
  to?: Date
}

/**
 * Campo de fecha de inicio y final. Mismo control que `BreaksField` (caja con
 * forma de input que abre un popover al hacer click) pero sin su sistema de
 * agregar varios: acá solo hay un rango, así que el valor seleccionado se
 * muestra directo en la caja en vez de como chips.
 */
export function DateRangeField({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = "Agregar",
}: {
  id?: string
  value: DateRange
  onChange: (value: DateRange) => void
  disabled?: boolean
  placeholder?: string
}) {
  const resolvedVariant = useInputVariant()
  const hasRange = Boolean(value.startDate && value.endDate)

  const selected: CalendarRange = {
    from: parseISODate(value.startDate),
    to: parseISODate(value.endDate),
  }

  function handleSelect(range: CalendarRange | undefined) {
    if (!range?.from) return
    onChange({
      startDate: toISODate(range.from),
      endDate: toISODate(range.to ?? range.from),
    })
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              inputVariants({ variant: resolvedVariant }),
              inputTriggerVariants({ variant: resolvedVariant }),
              "flex h-11 items-center gap-2 text-left",
            )}
          />
        }
      >
        {hasRange ? (
          <span className="flex flex-1 items-center gap-2 text-sm">
            <span className="tabular-nums">{formatDate(value.startDate)}</span>
            <ArrowRightIcon className="size-4 text-muted-foreground" />
            <span className="tabular-nums">{formatDate(value.endDate)}</span>
          </span>
        ) : (
          <span className="flex-1 text-muted-foreground">{placeholder}</span>
        )}
        <CalendarIcon className="size-5 shrink-0 text-primary/80" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar mode="range" selected={selected.from ? selected : undefined} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  )
}
