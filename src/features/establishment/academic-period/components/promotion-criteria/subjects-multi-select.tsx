import { CaretDownIcon, XIcon } from "@/components/ui/icons"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SubjectsMultiSelectProps {
  id?: string
  options: string[]
  value: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  emptyMessage?: string
}

// Select de varias materias: chips en el trigger + un dropdown con checkboxes
// al estilo de "Columnas visibles" (DataTableViewOptions).
export function SubjectsMultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Seleccionar",
  emptyMessage = "No hay áreas/asignaturas en este periodo.",
}: SubjectsMultiSelectProps) {
  const resolvedVariant = useInputVariant()

  function toggle(option: string) {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option])
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            id={id}
            type="button"
            className={cn(
              inputVariants({ variant: resolvedVariant }),
              inputTriggerVariants({ variant: resolvedVariant }),
              "flex h-auto min-h-10 items-center justify-between gap-2 text-left",
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        {options.length === 0 ? (
          <p className="text-muted-foreground px-2 py-1.5 text-sm">{emptyMessage}</p>
        ) : (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={value.includes(option)}
              onCheckedChange={() => toggle(option)}
              className="capitalize"
            >
              {option}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
