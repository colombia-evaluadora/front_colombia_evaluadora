import { useState } from "react"

import { CaretDownIcon, CheckIcon, PlusIcon } from "@/components/ui/icons"
import { Input, inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { usePeriodAreasQuery } from "@/features/establishment/academic-period/api/query/use-period-areas"

export type AreaSelection =
  | { mode: "existing"; id: number; nombre: string }
  | { mode: "new"; nombre: string }

interface AreaSelectProps {
  academicPeriodId?: number
  value: AreaSelection
  onChange: (value: AreaSelection) => void
}

// Selector de área ya creada en el período, con opción de crear una nueva
// al fondo — mismo patrón de `especialidad-select.tsx`. Evita que el
// usuario intente crear un área con un nombre que ya existe (error del
// backend por nombre único). Cuando el período aún no tiene ninguna área,
// no tiene sentido mostrar un select vacío con solo la opción de crear: se
// muestra directamente el input de texto.
export function AreaSelect({ academicPeriodId, value, onChange }: AreaSelectProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value.mode === "new" ? value.nombre : "")
  const resolvedVariant = useInputVariant()

  const { data: options = [] } = usePeriodAreasQuery(academicPeriodId)

  // Si lo que se escribe en "Agregar nueva área" coincide con una que ya
  // existe (mismo nombre, sin distinguir mayúsculas/espacios), no tiene
  // sentido intentar crearla — el backend la rechazaría por nombre
  // duplicado. En ese caso se selecciona la existente en su lugar.
  const draftMatch = options.find(
    (option) => option.label.trim().toUpperCase() === draft.trim().toUpperCase(),
  )

  function agregar() {
    const nombre = draft.trim()
    if (!nombre) return
    if (draftMatch) {
      onChange({ mode: "existing", id: draftMatch.id, nombre: draftMatch.label })
    } else {
      onChange({ mode: "new", nombre })
    }
    setOpen(false)
  }

  if (options.length === 0) {
    return (
      <Input
        placeholder="Nombre del área"
        maxLength={130}
        value={value.mode === "new" ? value.nombre : ""}
        onChange={(e) => onChange({ mode: "new", nombre: e.target.value.toUpperCase() })}
        className="uppercase placeholder:normal-case"
      />
    )
  }

  const displayValue = value.mode === "existing" ? value.nombre : value.nombre

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setDraft(value.mode === "new" ? value.nombre : "")
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              inputVariants({ variant: resolvedVariant }),
              inputTriggerVariants({ variant: resolvedVariant }),
              "flex items-center justify-between gap-1.5 text-left",
              resolvedVariant === "outlined" && "bg-background",
              displayValue ? "text-foreground" : "text-muted-foreground",
            )}
          />
        }
      >
        <span className="flex-1 truncate">{displayValue || "Seleccionar"}</span>
        <CaretDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        <div className="max-h-64 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange({ mode: "existing", id: option.id, nombre: option.label })
                setOpen(false)
              }}
              className="hover:bg-foreground/10 flex w-full items-center justify-between gap-2 rounded-none border-b border-border px-2 py-1.5 text-left text-sm last:border-b-0"
            >
              <span className="flex-1 truncate">{option.label}</span>
              {value.mode === "existing" && value.id === option.id && (
                <CheckIcon className="size-4 shrink-0" />
              )}
            </button>
          ))}
        </div>
        <div className="px-1 py-1">
          <InputGroup className="h-11 rounded-md border border-input px-1 hover:border-ring has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
            <InputGroupInput
              value={draft}
              maxLength={130}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  agregar()
                }
              }}
              placeholder="Agregar nueva área"
              aria-label="Nombre de la nueva área"
            />
            <InputGroupAddon align="inline-end">
              <Button
                type="button"
                color="primary"
                size="icon-sm"
                aria-label={draftMatch ? `Seleccionar "${draftMatch.label}"` : "Agregar área"}
                disabled={!draft.trim()}
                onClick={agregar}
              >
                {draftMatch ? <CheckIcon /> : <PlusIcon weight="bold" />}
              </Button>
            </InputGroupAddon>
          </InputGroup>
          {draftMatch && (
            <p className="px-1 pt-1 text-xs text-muted-foreground">
              Ya existe el área "{draftMatch.label}" — se seleccionará en vez de crear una nueva.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
