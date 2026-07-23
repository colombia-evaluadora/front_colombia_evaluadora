import { CaretDownIcon, XIcon } from "@phosphor-icons/react"

import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import type { TeachingLevel } from "../../../api/types/academic-period/rating-scales"

interface TeachingLevelsMultiSelectProps {
  id?: string
  levels: TeachingLevel[]
  value: number[]
  onChange: (ids: number[]) => void
  invalid?: boolean
}

export function TeachingLevelsMultiSelect({
  id,
  levels,
  value,
  onChange,
  invalid,
}: TeachingLevelsMultiSelectProps) {
  const selected = levels.filter((level) => value.includes(level.id))

  function toggle(levelId: number) {
    onChange(
      value.includes(levelId)
        ? value.filter((v) => v !== levelId)
        : [...value, levelId]
    )
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            aria-invalid={invalid}
            className={cn(
              "border-input hover:border-ring/50 data-[popup-open]:border-ring aria-invalid:border-destructive flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border bg-transparent px-3 py-1.5 text-left text-sm outline-none transition-colors"
            )}
          />
        }
      >
        <div className="flex flex-1 flex-wrap gap-1.5">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">Seleccionar</span>
          ) : (
            selected.map((level) => (
              <span
                key={level.id}
                className="bg-muted flex items-center gap-1 rounded px-2 py-0.5 text-xs"
              >
                {level.nombre}
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Quitar ${level.nombre}`}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(level.id)
                  }}
                >
                  <XIcon className="size-3" />
                </span>
              </span>
            ))
          )}
        </div>
        <CaretDownIcon className="text-muted-foreground size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" className="min-w-64 p-1">
        {levels.map((level) => (
          <label
            key={level.id}
            className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm"
          >
            <Checkbox
              checked={value.includes(level.id)}
              onCheckedChange={() => toggle(level.id)}
            />
            {level.nombre}
          </label>
        ))}
      </PopoverContent>
    </Popover>
  )
}
