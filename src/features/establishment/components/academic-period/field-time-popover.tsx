import { ClockIcon } from "@phosphor-icons/react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TimePicker } from "@/components/ui/time-picker"
import { cn } from "@/lib/utils"

interface FieldTimePopoverProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  invalid?: boolean
}

export function FieldTimePopover({
  id,
  value,
  onChange,
  placeholder = "Seleccionar",
  invalid,
}: FieldTimePopoverProps) {
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
              value ? "text-foreground" : "text-muted-foreground"
            )}
          />
        }
      >
        <span className="truncate">{value || placeholder}</span>
        <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <TimePicker value={value || undefined} onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}
