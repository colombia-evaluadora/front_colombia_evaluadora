import { CaretDownIcon, CheckIcon, XIcon } from "@/components/ui/icons"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface SubjectsMultiSelectProps {
  id?: string
  options: string[]
  value: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  emptyMessage?: string
}

// Select de varias materias (chips + popover con checks). Reutilizable para
// cualquier lista de strings; las opciones vienen de área/asignatura.
export function SubjectsMultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Seleccionar",
  emptyMessage = "No hay áreas/asignaturas en este periodo.",
}: SubjectsMultiSelectProps) {
  function toggle(option: string) {
    onChange(
      value.includes(option)
        ? value.filter((v) => v !== option)
        : [...value, option]
    )
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            className={cn(
              "flex min-h-10 w-full items-center justify-between gap-2 border border-transparent border-b-input bg-transparent px-0 py-2 text-left text-sm outline-none transition-[color,border-color] hover:border-b-ring/50 focus-visible:border-b-ring data-[popup-open]:border-b-ring"
            )}
          />
        }
      >
        <div className="flex flex-1 flex-wrap gap-1.5">
          {value.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            value.map((subject) => (
              <span
                key={subject}
                className="bg-muted flex items-center gap-1 rounded-none px-2 py-0.5 text-xs"
              >
                {subject}
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Quitar ${subject}`}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(subject)
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
        {options.length === 0 ? (
          <p className="text-muted-foreground px-2 py-1.5 text-sm">
            {emptyMessage}
          </p>
        ) : (
          options.map((option) => {
            const isSelected = value.includes(option)
            return (
              <button
                key={option}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggle(option)}
                className="hover:bg-foreground/10 flex w-full cursor-pointer items-center justify-between gap-2 px-2 py-1.5 text-left text-sm"
              >
                {option}
                {isSelected && <CheckIcon className="size-4 shrink-0" />}
              </button>
            )
          })
        )}
      </PopoverContent>
    </Popover>
  )
}
