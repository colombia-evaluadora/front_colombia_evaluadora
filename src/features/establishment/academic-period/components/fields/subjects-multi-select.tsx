import { useLayoutEffect, useRef, useState, type RefObject } from "react"

import { CaretDownIcon, XIcon } from "@/components/ui/icons"

import { Badge } from "@/components/ui/badge"
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
}

// Cuenta cuántos chips entran en una sola línea del contenedor, achicando de a
// uno hasta que deje de desbordar. Arranca mostrando todos (sin badge "+N") y
// cada línea de layout siguiente mide de nuevo: si el badge "+N" que aparece
// al recortar no alcanza a entrar, se sigue recortando hasta que sí — así
// nunca se ve un "+1" solo cayendo a una segunda línea.
function useVisibleChipCount(containerRef: RefObject<HTMLDivElement | null>, total: number): number {
  const [count, setCount] = useState(total)

  useLayoutEffect(() => {
    setCount(total)
  }, [total])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (el && el.scrollWidth > el.clientWidth && count > 0) {
      setCount((current) => current - 1)
    }
  })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => setCount(total))
    observer.observe(el)
    return () => observer.disconnect()
  }, [containerRef, total])

  return count
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
}: SubjectsMultiSelectProps<T>) {
  const resolvedVariant = useInputVariant()
  const labelById = new Map(options.map((o) => [o.id, o.label]))
  const chipsRef = useRef<HTMLDivElement>(null)
  const visibleCount = useVisibleChipCount(chipsRef, value.length)

  function toggle(optionId: T) {
    onChange(value.includes(optionId) ? value.filter((v) => v !== optionId) : [...value, optionId])
  }

  const visible = value.slice(0, visibleCount)
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
              disabled={disabled}
              className="absolute inset-0 z-0 cursor-pointer bg-transparent outline-none disabled:cursor-not-allowed"
            />
          }
        />
        <div
          ref={chipsRef}
          className="pointer-events-none relative z-10 flex flex-1 flex-nowrap items-center gap-1 overflow-hidden"
        >
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
            <Tooltip key={option.id}>
              <TooltipTrigger
                render={
                  <DropdownMenuCheckboxItem
                    checked={value.includes(option.id)}
                    onCheckedChange={() => toggle(option.id)}
                    disabled={disabled}
                    className="capitalize"
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
