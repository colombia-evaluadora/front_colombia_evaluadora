import { CalendarIcon, ClockIcon } from "@phosphor-icons/react"
import { format, parseISO, setHours, setMinutes } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { TimePicker } from "@/components/ui/time-picker"
import { cn } from "@/lib/utils"

const DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm"

interface FieldDateTimePopoverProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function FieldDateTimePopover({
  label,
  value,
  onChange,
  placeholder = "Elegí fecha y hora",
}: FieldDateTimePopoverProps) {
  const selected = value ? parseISO(value) : undefined

  const displayLabel = selected
    ? format(selected, "d MMM yyyy, HH:mm", { locale: es })
    : placeholder

  const timeValue = selected ? format(selected, "HH:mm") : undefined
  const timeLabel = selected ? format(selected, "HH:mm") : "--:--"

  function handleSelectDate(date: Date | undefined) {
    if (!date) {
      onChange("")
      return
    }
    const next = selected
      ? setMinutes(setHours(date, selected.getHours()), selected.getMinutes())
      : date
    onChange(format(next, DATE_TIME_FORMAT))
  }

  function handleTimeChange(time: string) {
    const [h, m] = time.split(":").map(Number)
    const base = selected ?? new Date()
    const next = setMinutes(setHours(base, h), m)
    onChange(format(next, DATE_TIME_FORMAT))
  }

  return (
    <Field orientation="vertical" className="gap-2">
      <FieldLabel>{label}</FieldLabel>
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex h-9 w-full min-w-0 cursor-pointer items-center gap-2 border border-transparent border-b-input bg-transparent px-0 py-1 text-left text-base transition-[color,border-color] outline-none hover:border-b-ring/50 focus-visible:border-b-ring data-[popup-open]:border-b-ring md:text-sm",
                selected ? "text-foreground" : "text-muted-foreground"
              )}
            />
          }
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          {displayLabel}
        </PopoverTrigger>
        <PopoverContent className="w-auto gap-0 p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelectDate}
            locale={es}
          />
          <Separator />
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start rounded-none font-normal"
                />
              }
            >
              <ClockIcon data-icon="inline-start" />
              {timeLabel}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <TimePicker value={timeValue} onChange={handleTimeChange} />
            </PopoverContent>
          </Popover>
        </PopoverContent>
      </Popover>
    </Field>
  )
}
