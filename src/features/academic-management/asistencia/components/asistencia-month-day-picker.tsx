import * as React from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CaretDownIcon } from "@/components/ui/icons"

interface AsistenciaMonthDayPickerProps {
  selected: Date
  onSelect: (date: Date) => void
}

export function AsistenciaMonthDayPicker({ selected, onSelect }: AsistenciaMonthDayPickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="ghost" color="neutral" size="sm" className="gap-2 px-1">
            <span className="flex w-11 flex-col items-center rounded-md bg-muted-22 py-0.5 leading-none">
              <span className="text-[0.625rem] font-bold tracking-wide text-muted-foreground uppercase">
                {selected.toLocaleDateString("es-CO", { month: "short" }).slice(0, 3)}
              </span>
              <span className="text-sm font-bold text-foreground">
                {selected.toLocaleDateString("es-CO", { day: "numeric" })}
              </span>
            </span>
            <span className="flex items-center gap-1 text-lg font-bold text-foreground capitalize">
              {selected.toLocaleDateString("es-CO", { month: "long" })}
              <CaretDownIcon className="size-5 text-muted-foreground" />
            </span>
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          month={selected}
          onSelect={(date: Date | undefined) => {
            if (!date) return
            onSelect(date)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
