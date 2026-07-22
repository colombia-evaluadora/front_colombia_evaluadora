import { CalendarIcon } from "@phosphor-icons/react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const DATE_FORMAT = "yyyy-MM-dd"

interface FieldDatePopoverProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  invalid?: boolean
}

export function FieldDatePopover({
  id,
  value,
  onChange,
  placeholder = "Seleccionar",
  invalid,
}: FieldDatePopoverProps) {
  const selected = value ? parseISO(value) : undefined
  const displayLabel = selected
    ? format(selected, "d MMM yyyy", { locale: es })
    : placeholder

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            aria-invalid={invalid}
            className={cn(
              "border-input flex h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border bg-transparent px-3 py-1 text-left text-sm outline-none transition-colors hover:border-ring/50 focus-visible:border-ring data-[popup-open]:border-ring aria-invalid:border-destructive",
              selected ? "text-foreground" : "text-muted-foreground"
            )}
          />
        }
      >
        <span className="truncate">{displayLabel}</span>
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date: Date) => onChange(date ? format(date, DATE_FORMAT) : "")}
          locale={es}
        />
      </PopoverContent>
    </Popover>
  )
}
