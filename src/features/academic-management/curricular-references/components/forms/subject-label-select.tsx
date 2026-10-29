import { useState } from "react"

import { CaretDownIcon, CheckIcon, PlusIcon, SpinnerIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/api-client"
import { toReferenteTextInput } from "@/features/academic-management/curricular-references/utils/catalogs"

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
      {/* Mismo ancho que el campo; mínimo para que entren nombre, check y papelera. */}
      <PopoverContent align="start" className="w-(--anchor-width) min-w-64 p-0">
        <div className="flex flex-col">
          {error && <p className="border-b border-border px-3 py-2 text-xs wrap-anywhere text-red">{error}</p>}
          <div role="listbox" aria-label="Rótulos de área" className="max-h-64 overflow-x-hidden overflow-y-auto p-1">
            {options.length === 0 ? (
              <p className="px-2 py-2 text-sm text-muted-foreground">Aún no hay rótulos. Agrega el primero abajo.</p>
            ) : null}
            {options.map((option) => {
              const selected = option.id === value?.id
              const removable = !option.isSeed
              return (
                // La papelera se monta sobre el lugar del check: el check queda
                // siempre al borde derecho, haya o no papelera.
                <div
                  key={option.id}
                  className="group relative flex min-w-0 items-center rounded-md hover:bg-foreground/10 has-[button:focus-visible]:bg-foreground/10"
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange({ id: option.id, code: option.code, name: option.name })
                      setOpen(false)
                    }}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm outline-none",
                      selected && "font-medium text-primary",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate" title={option.name}>{option.name}</span>
                    {selected && (
                      <CheckIcon
                        className={cn(
                          "size-4 shrink-0",
                          removable &&
                            "group-hover:opacity-0 group-has-[button:focus-visible]:opacity-0 [@media(hover:none)]:opacity-0",
                        )}
                      />
                    )}
                  </button>
                  {removable && (
                    // Solo al pasar el mouse o con foco; en pantallas táctiles siempre visible.
                    <ConfirmRemoveButton
                      size="icon-xs"
                      className="absolute right-1 size-6 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 [&_svg:not([class*='size-'])]:size-3.5"
                      label={`Eliminar ${option.name}`}
                      title="Eliminar rótulo"
                      description={`¿Eliminar "${option.name}"? Esta acción no se puede deshacer.`}
                      disabled={deleteOption.isPending}
                      onConfirm={() => confirmarEliminar(option.id)}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <div className="border-t border-border p-1.5">
            <InputGroup className="h-8 rounded-md border border-input hover:border-ring has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
              <InputGroupInput
                value={nuevo}
                maxLength={50}
                onChange={(e) => setNuevo(toReferenteTextInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    agregar()
                  }
                }}
                placeholder="Agregar otro rótulo"
                aria-label="Nuevo rótulo"
                className="text-sm"
              />
              <InputGroupAddon align="inline-end" className="gap-1.5 pr-0.5">
                <span aria-hidden className="text-xs text-muted-foreground tabular-nums">
                  {nuevo.length} / 50
                </span>
                {/* Discreto hasta que hay texto: deshabilitado no parece un botón activo. */}
                <Button
                  type="button"
                  variant={nuevo.trim() ? "fill" : "ghost"}
                  color={nuevo.trim() ? "primary" : "neutral"}
                  size="icon-xs"
                  className="size-6"
                  aria-label="Agregar rótulo"
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
