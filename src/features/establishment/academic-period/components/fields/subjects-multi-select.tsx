import { ChipsSeleccion } from "@/components/chips-seleccion"
import { CaretDownIcon } from "@/components/ui/icons"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface SubjectOptionLike<T extends string | number> {
  id: T
  label: string
}

interface SubjectsMultiSelectProps<T extends string | number> {
  id?: string
  options: SubjectOptionLike<T>[]
  value: T[]
  onChange: (values: T[]) => void
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  /** Opciones que no se pueden quitar: su chip va sin «×» y su casilla queda deshabilitada en la lista. */
  fijos?: T[]
}


// Select de varias opciones: chips en el trigger + un dropdown con checkboxes
// al estilo de "Columnas visibles" (DataTableViewOptions). Selecciona por
// `id` — el label es solo para mostrar. Genérico en `T` (number o string) para
// que sirva tanto para ids de catálogo como para claves de enum.
export function SubjectsMultiSelect<T extends string | number>({
  id,
  options,
  value,
  onChange,
  placeholder = "Seleccionar",
  emptyMessage = "No hay áreas/asignaturas en este periodo.",
  disabled = false,
  fijos = [],
}: SubjectsMultiSelectProps<T>) {
  const resolvedVariant = useInputVariant()
  const labelById = new Map(options.map((o) => [o.id, o.label]))

  function toggle(optionId: T) {
    onChange(value.includes(optionId) ? value.filter((v) => v !== optionId) : [...value, optionId])
  }

  return (
    <DropdownMenu>
      <div
        className={cn(
          inputVariants({ variant: resolvedVariant }),
          inputTriggerVariants({ variant: resolvedVariant }),
          "relative flex h-auto min-h-10 items-center gap-2 text-left",
          // El contorno es un div: sin esto seguía resaltando al pasar el mouse.
          disabled && "cursor-not-allowed bg-muted/50 opacity-70 hover:border-input",
        )}
      >
        <DropdownMenuTrigger
          render={
            <button
              id={id}
              type="button"
              disabled={disabled}
              className="absolute inset-0 z-0 cursor-pointer bg-transparent outline-none disabled:cursor-not-allowed"
            />
          }
        />
        {/* Los chips son el componente común (`ChipsSeleccion`): el mismo aspecto en todos los selectores múltiples. */}
        {value.length === 0 ? (
          <span className="pointer-events-none relative z-10 flex-1 text-muted-foreground">{placeholder}</span>
        ) : (
          <ChipsSeleccion
            className="relative z-10"
            elementos={value.map((optionId) => ({
              id: optionId,
              label: labelById.get(optionId) ?? String(optionId),
              fijo: fijos.includes(optionId),
            }))}
            deshabilitado={disabled}
            onQuitar={toggle}
          />
        )}
        <CaretDownIcon className="text-muted-foreground pointer-events-none relative z-10 size-5 shrink-0" />
      </div>
      <DropdownMenuContent align="start" className="min-w-64">
        {options.length === 0 ? (
          <p className="text-muted-foreground px-2 py-1.5 text-sm">{emptyMessage}</p>
        ) : (
          options.map((option) => (
            <Tooltip key={option.id}>
              <TooltipTrigger
                render={
                  <DropdownMenuCheckboxItem
                    checked={value.includes(option.id)}
                    onCheckedChange={() => toggle(option.id)}
                    disabled={disabled || fijos.includes(option.id)}
                    // Sin `capitalize`: el texto va como viene (mayúscula solo inicial, CLAUDE.md §13).
                  />
                }
              >
                {option.label}
              </TooltipTrigger>
              <TooltipContent side="right">{option.label}</TooltipContent>
            </Tooltip>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
