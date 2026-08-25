import { CaretDownIcon, XIcon } from "@/components/ui/icons"

import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SubjectOptionLike {
  id: number
  label: string
}

interface SubjectsMultiSelectProps {
  id?: string
  options: SubjectOptionLike[]
  value: number[]
  onChange: (values: number[]) => void
  placeholder?: string
  emptyMessage?: string
}

const MAX_VISIBLE_CHIPS = 3

// Select de varias materias: chips en el trigger + un dropdown con checkboxes
// al estilo de "Columnas visibles" (DataTableViewOptions). Selecciona por
// `id` — el label (nombre, o nombre + énfasis si el nombre se repite) es
// solo para mostrar.
export function SubjectsMultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Seleccionar",
  emptyMessage = "No hay áreas/asignaturas en este periodo.",
}: SubjectsMultiSelectProps) {
  const resolvedVariant = useInputVariant()
  const labelById = new Map(options.map((o) => [o.id, o.label]))

  function toggle(optionId: number) {
    onChange(value.includes(optionId) ? value.filter((v) => v !== optionId) : [...value, optionId])
  }

  const visible = value.slice(0, MAX_VISIBLE_CHIPS)
  const extra = value.length - visible.length

  return (
    <DropdownMenu>
      <div
        className={cn(
          inputVariants({ variant: resolvedVariant }),
          inputTriggerVariants({ variant: resolvedVariant }),
          "relative flex h-auto min-h-11 items-center gap-2 text-left",
        )}
      >
        <DropdownMenuTrigger
          render={
            <button
              id={id}
              type="button"
              className="absolute inset-0 z-0 cursor-pointer bg-transparent outline-none"
            />
          }
        />
        <div className="pointer-events-none relative z-10 flex flex-1 flex-wrap items-center gap-1">
          {value.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <>
              {visible.map((optionId) => (
                <Badge
                  key={optionId}
                  variant="soft"
                  color="muted"
                  className="text-xs"
                  title={labelById.get(optionId)}
                >
                  {labelById.get(optionId) ?? optionId}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(optionId)
                    }}
                    aria-label={`Quitar ${labelById.get(optionId) ?? optionId}`}
                    data-icon="inline-end"
                    className="pointer-events-auto inline-flex cursor-pointer items-center hover:text-foreground"
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))}
              {extra > 0 && (
                <Badge variant="soft" color="muted" className="text-xs normal-case tracking-normal">
                  +{extra}
                </Badge>
              )}
            </>
          )}
        </div>
        <CaretDownIcon className="text-muted-foreground pointer-events-none relative z-10 size-4 shrink-0" />
      </div>
      <DropdownMenuContent align="start" className="min-w-64">
        {options.length === 0 ? (
          <p className="text-muted-foreground px-2 py-1.5 text-sm">{emptyMessage}</p>
        ) : (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.id}
              checked={value.includes(option.id)}
              onCheckedChange={() => toggle(option.id)}
              className="capitalize"
              title={option.label}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
