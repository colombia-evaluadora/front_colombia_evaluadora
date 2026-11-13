import { useState } from "react"

import { CaretDownIcon, CheckIcon } from "@/components/ui/icons"
import { inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import { useEspecialidadesQuery } from "@/features/establishment/academic-period/api/query/use-especialidades"

interface EspecialidadSelectProps {
  value: string
  academicPeriodId?: number
  onChange: (value: string) => void
}

/**
 * Especialidad de la asignatura: solo las especialidades Activas del catálogo
 * de la sede del período (Regla 86, Sección 5.3). El catálogo se gestiona en
 * Sedes educativas; acá no se crean ni se renombran. Una asignatura vieja puede
 * conservar una especialidad que ya no está en el catálogo: se muestra y se
 * guarda igual mientras no se elija otra.
 */
export function EspecialidadSelect({ value, academicPeriodId, onChange }: EspecialidadSelectProps) {
  const [open, setOpen] = useState(false)
  const resolvedVariant = useInputVariant()
  const { data: options = [], isPending } = useEspecialidadesQuery(academicPeriodId)
  const fueraDelCatalogo = Boolean(value) && !isPending && !options.some((option) => option.label === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              inputVariants({ variant: resolvedVariant }),
              inputTriggerVariants({ variant: resolvedVariant }),
              "flex items-center justify-between gap-1.5 text-left",
              resolvedVariant === "outlined" && "bg-background",
              value ? "text-foreground" : "text-muted-foreground",
            )}
          />
        }
      >
        <span className="flex-1 truncate">{value || "Seleccionar"}</span>
        <CaretDownIcon className="size-5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      {/* Mismo ancho que el campo; mínimo para que se lean los nombres. */}
      <PopoverContent align="start" className="w-(--anchor-width) min-w-64 p-0">
        <div className="max-h-64 overflow-x-hidden overflow-y-auto p-1">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.label)
                setOpen(false)
              }}
              className={cn(
                "flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-foreground/10 focus-visible:bg-foreground/10",
                option.label === value && "font-medium text-primary",
              )}
            >
              <span className="min-w-0 flex-1 truncate" title={option.label}>
                {option.label}
              </span>
              {option.label === value ? <CheckIcon className="size-4 shrink-0" /> : null}
            </button>
          ))}
          {!isPending && options.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              La sede no tiene especialidades activas. Agréguelas en Sedes educativas, en el catálogo de la sede.
            </p>
          ) : null}
        </div>
        {fueraDelCatalogo ? (
          <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            «{value}» ya no está en el catálogo de la sede: se conserva mientras no elija otra.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
