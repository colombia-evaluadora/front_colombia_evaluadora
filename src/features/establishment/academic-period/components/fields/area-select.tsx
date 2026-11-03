import { useState } from "react"

import { CaretDownIcon, CheckIcon, PlusIcon } from "@/components/ui/icons"
import { Input, inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
      {/* Mismo ancho que el campo; mínimo para que entren nombre, check y papelera. */}
      <PopoverContent align="start" className="w-(--anchor-width) min-w-64 p-0">
        {error && <p className="border-b border-border px-3 py-2 text-xs wrap-anywhere text-red">{error}</p>}
        <div className="max-h-64 overflow-x-hidden overflow-y-auto p-1">
          {options.map((option) => (
            // La papelera se monta sobre el lugar del check: el check queda
            // siempre al borde derecho.
            <div
              key={option.id}
              className="group relative flex min-w-0 items-center rounded-md text-sm hover:bg-foreground/10 has-[button:focus-visible]:bg-foreground/10"
            >
              <button
                type="button"
                onClick={() => {
                  onChange({ mode: "existing", id: option.id, nombre: option.label })
                  setOpen(false)
                }}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left outline-none",
                  value.mode === "existing" && value.id === option.id && "font-medium text-primary",
                )}
              >
                <span className="min-w-0 flex-1 truncate" title={option.label}>{option.label}</span>
                {value.mode === "existing" && value.id === option.id && (
                  <CheckIcon className="size-4 shrink-0 group-hover:opacity-0 group-has-[button:focus-visible]:opacity-0 [@media(hover:none)]:opacity-0" />
                )}
              </button>
              <ConfirmRemoveButton
                label={`Eliminar ${option.label}`}
                description={`Se eliminará permanentemente el área ${option.label}. Esta acción no se puede deshacer.`}
                size="icon-xs"
                // Solo al pasar el mouse o con foco; en pantallas táctiles siempre visible.
                className="absolute right-1 size-6 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 [&_svg:not([class*='size-'])]:size-3.5"
                onConfirm={() => handleDelete(option)}
              />
            </div>
          ))}
        </div>
        <div className="border-t border-border p-1.5">
          <InputGroup className="h-8 rounded-md border border-input hover:border-ring has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
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
              className="text-sm"
            />
            <InputGroupAddon align="inline-end" className="gap-1.5 pr-0.5">
              <span aria-hidden className="text-xs text-muted-foreground tabular-nums">
                {draft.length} / 130
              </span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      // Discreto hasta que hay texto: deshabilitado no parece un botón activo.
                      variant={draft.trim() ? "fill" : "ghost"}
                      color={draft.trim() ? "primary" : "neutral"}
                      size="icon-xs"
                      className="size-6"
                      aria-label={draftMatch ? `Seleccionar "${draftMatch.label}"` : "Agregar área"}
                      disabled={!draft.trim()}
                      onClick={agregar}
                    />
                  }
                >
                  {draftMatch ? <CheckIcon /> : <PlusIcon weight="bold" />}
                </TooltipTrigger>
                <TooltipContent>
                  {draftMatch ? `Seleccionar "${draftMatch.label}"` : "Agregar área"}
                </TooltipContent>
              </Tooltip>
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
