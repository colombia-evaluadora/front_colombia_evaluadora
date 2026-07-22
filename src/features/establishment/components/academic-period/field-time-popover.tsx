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
              "flex h-9 w-full min-w-0 cursor-pointer items-center gap-2 border border-transparent border-b-input bg-transparent px-0 py-1 text-left text-base transition-[color,border-color] outline-none hover:border-b-ring/50 focus-visible:border-b-ring data-[popup-open]:border-b-ring aria-invalid:border-b-destructive md:text-sm",
              value ? "text-foreground" : "text-muted-foreground"
            )}
          />
        }
      >
        <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
        {value || placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <TimePicker value={value || undefined} onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}
