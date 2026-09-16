import { useState } from "react"

import { CaretDownIcon, CheckIcon, PlusIcon, SpinnerIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/api-client"

import { useSubjectLabelOptionsQuery } from "@/features/academic-management/curricular-references/api/query/use-subject-label-options"
import { useCreateSubjectLabelOption } from "@/features/academic-management/curricular-references/api/mutations/use-create-subject-label"
import { useDeleteSubjectLabelOption } from "@/features/academic-management/curricular-references/api/mutations/use-delete-subject-label"

import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

interface SubjectLabelSelectProps {
  value: CatalogItem | null
  onChange: (option: CatalogItem | null) => void
  id?: string
  invalid?: boolean
  placeholder?: string
}

export function SubjectLabelSelect({
  value,
  onChange,
  id,
  invalid,
  placeholder = "Seleccione",
}: SubjectLabelSelectProps) {
  const [open, setOpen] = useState(false)
  const [nuevo, setNuevo] = useState("")
  const [error, setError] = useState<string | null>(null)
  const resolvedVariant = useInputVariant()

  const { data: options = [] } = useSubjectLabelOptionsQuery()

  const createOption = useCreateSubjectLabelOption({
    mutationConfig: {
      onSuccess: (createdId) => {
        setError(null)
        onChange({ id: createdId, code: "", name: nuevo.trim() })
        setNuevo("")
      },
      onError: (err) => setError(getErrorMessage(err)),
    },
  })
  const deleteOption = useDeleteSubjectLabelOption({
    mutationConfig: {
      onSuccess: (_result, deletedId) => {
        setError(null)
        if (value?.id === deletedId) onChange(null)
      },
      onError: (err) => setError(getErrorMessage(err)),
    },
  })

  function agregar() {
    const valor = nuevo.trim()
    if (!valor) return
    createOption.mutate(valor)
  }

  async function confirmarEliminar(optionId: number) {
    try {
      await deleteOption.mutateAsync(optionId)
    } catch {
      // El error ya queda visible en el banner del popover (onError de arriba).
    }
    return true
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            id={id}
            aria-invalid={invalid}
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
        <span className="min-w-0 flex-1 truncate">{value?.name || placeholder}</span>
        <CaretDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        <div className="flex flex-col">
          {error && <p className="border-b border-border px-2 py-1.5 text-xs text-red">{error}</p>}
          <div className="max-h-64 overflow-y-auto">
            {options.map((option) => (
              <div
                key={option.id}
                className="hover:bg-foreground/10 flex items-center justify-between gap-2 rounded-none border-b border-border px-2 py-1 text-sm last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => {
                    onChange({ id: option.id, code: option.code, name: option.name })
                    setOpen(false)
                  }}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <span className="flex-1 truncate">{option.name}</span>
                  {option.id === value?.id && <CheckIcon className="size-4 shrink-0" />}
                </button>
                {!option.isSeed && (
                  <ConfirmRemoveButton
                    size="icon-xs"
                    className="size-5 [&_svg:not([class*='size-'])]:size-3"
                    label={`Eliminar ${option.name}`}
                    title="Eliminar valor"
                    description={`¿Eliminar "${option.name}"? Esta acción no se puede deshacer.`}
                    disabled={deleteOption.isPending}
                    onConfirm={() => confirmarEliminar(option.id)}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="px-1 py-1">
            <InputGroup className="h-11 rounded-md border border-input px-1 hover:border-ring has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
              <InputGroupInput
                value={nuevo}
                maxLength={100}
                onChange={(e) => setNuevo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    agregar()
                  }
                }}
                placeholder="Agregar otro"
                aria-label="Nuevo valor"
              />
              <InputGroupAddon align="inline-end">
                <Button
                  type="button"
                  color="primary"
                  size="icon-sm"
                  aria-label="Agregar valor"
                  disabled={!nuevo.trim() || createOption.isPending}
                  onClick={agregar}
                >
                  {createOption.isPending ? <SpinnerIcon className="animate-spin" /> : <PlusIcon weight="bold" />}
                </Button>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
