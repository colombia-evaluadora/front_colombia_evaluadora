import { useState } from "react"

import { CaretDownIcon, CheckIcon, PlusIcon } from "@/components/ui/icons"
import { Input, inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/api-client"

import { usePeriodAreasQuery } from "@/features/establishment/academic-period/api/query/use-period-areas"
import { useDeleteAreaSubject } from "@/features/establishment/academic-period/api/mutations/delete-area-subject"

export type AreaSelection =
  | { mode: "existing"; id: number; nombre: string }
  | { mode: "new"; nombre: string }

interface AreaSelectProps {
  academicPeriodId?: number
  value: AreaSelection
  onChange: (value: AreaSelection) => void
}

export function AreaSelect({ academicPeriodId, value, onChange }: AreaSelectProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value.mode === "new" ? value.nombre : "")
  const [error, setError] = useState<string | null>(null)
  const resolvedVariant = useInputVariant()

  const { data: options = [] } = usePeriodAreasQuery(academicPeriodId)
  const deleteArea = useDeleteAreaSubject()

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

  async function handleDelete(option: { id: number; label: string }): Promise<boolean> {
    try {
      const result = await deleteArea.mutateAsync(option.id)
      if (result.status === "error") {
        setError(result.message)
        return true
      }
    } catch (err) {
      setError(getErrorMessage(err))
      return true
    }
    setError(null)
    if (value.mode === "existing" && value.id === option.id) {
      onChange({ mode: "new", nombre: "" })
    }
    return true
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
        setError(null)
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
        {error && <p className="border-b border-border px-2 py-1.5 text-xs text-red">{error}</p>}
        <div className="max-h-64 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option.id}
              className="hover:bg-foreground/10 flex items-center justify-between gap-1 border-b border-border pr-1 text-sm last:border-b-0"
            >
              <button
                type="button"
                onClick={() => {
                  onChange({ mode: "existing", id: option.id, nombre: option.label })
                  setOpen(false)
                }}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-none px-2 py-1.5 text-left"
              >
                <span className="flex-1 truncate">{option.label}</span>
                {value.mode === "existing" && value.id === option.id && (
                  <CheckIcon className="size-4 shrink-0" />
                )}
              </button>
              <ConfirmRemoveButton
                label={`Eliminar ${option.label}`}
                description={`Se eliminará permanentemente el área ${option.label}. Esta acción no se puede deshacer.`}
                size="icon-xs"
                className="size-5 shrink-0 text-muted-foreground [&_svg:not([class*='size-'])]:size-3"
                onConfirm={() => handleDelete(option)}
              />
            </div>
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
