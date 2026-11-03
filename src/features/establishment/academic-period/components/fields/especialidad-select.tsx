import { useState } from "react"

import {
  CaretDownIcon,
  CheckIcon,
  PencilIcon,
  PlusIcon,
  SpinnerIcon,
  TrashIcon,
  XIcon,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Input, inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/api-client"

import { useEspecialidadesQuery } from "@/features/establishment/academic-period/api/query/use-especialidades"
import { useCreateEnfasis } from "@/features/establishment/academic-period/api/mutations/create-enfasis"
import { useUpdateEnfasis } from "@/features/establishment/academic-period/api/mutations/update-enfasis"
import { useDeleteEnfasis } from "@/features/establishment/academic-period/api/mutations/delete-enfasis"
import { toPeriodoTextInput } from "@/features/establishment/academic-period/utils/text-input"

interface EspecialidadSelectProps {
  value: string
  academicPeriodId?: number
  onChange: (value: string) => void
}

export function EspecialidadSelect({
  value,
  academicPeriodId,
  onChange,
}: EspecialidadSelectProps) {
  const [open, setOpen] = useState(false)
  const [nuevo, setNuevo] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  // Mensaje inline propio: este popover no tiene acceso al `NoticeOutlet` del
  // diálogo que lo contiene, así que no puede depender del toast global (ver
  // fn_enfasis_soft_delete: "No se puede eliminar el enfasis %: existen
  // asignaturas asociadas").
  const [error, setError] = useState<string | null>(null)
  const resolvedVariant = useInputVariant()

  const { data: options = [] } = useEspecialidadesQuery(academicPeriodId)
  const sortedOptions = (() => {
    const especialidades: typeof options = []
    const enfasis: typeof options = []
    for (const option of options) {
      if (option.origen !== "ENFASIS") {
        especialidades.push(option)
        continue
      }
      const trimmed = option.label.trim()
      if (!trimmed || /^\d+$/.test(trimmed)) continue
      enfasis.push(option)
    }
    return [...especialidades, ...enfasis]
  })()

  const createEnfasis = useCreateEnfasis({
    mutationConfig: {
      onSuccess: () => {
        setError(null)
        onChange(nuevo.trim())
        setNuevo("")
      },
      onError: (err) => setError(getErrorMessage(err)),
    },
  })
  const updateEnfasis = useUpdateEnfasis({
    mutationConfig: {
      onSuccess: (_id, variables) => {
        setError(null)
        if (value === options.find((o) => o.id === editingId)?.label) {
          onChange(variables.nombre)
        }
        setEditingId(null)
      },
      onError: (err) => setError(getErrorMessage(err)),
    },
  })
  const deleteEnfasis = useDeleteEnfasis({
    mutationConfig: {
      onSuccess: (_result, id) => {
        setError(null)
        const removed = options.find((o) => o.id === id)
        if (removed && value === removed.label) onChange("")
      },
      onError: (err) => setError(getErrorMessage(err)),
    },
  })

  function agregar() {
    const nombre = nuevo.trim()
    if (!nombre || academicPeriodId == null) return
    createEnfasis.mutate({ academicPeriodId, nombre })
  }

  function startEdit(id: number, currentName: string) {
    setError(null)
    setEditingId(id)
    setEditingName(currentName)
  }

  function saveEdit() {
    if (editingId == null || !editingName.trim()) return
    updateEnfasis.mutate({ id: editingId, nombre: editingName.trim() })
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
        <CaretDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      {/* Mismo ancho que el campo; mínimo para que entren nombre, check y acciones. */}
      <PopoverContent align="start" className="w-(--anchor-width) min-w-64 p-0">
        <div className="flex flex-col">
          {error && (
            <p className="border-b border-border px-3 py-2 text-xs wrap-anywhere text-red">{error}</p>
          )}
          <div className="max-h-64 overflow-x-hidden overflow-y-auto p-1">
            {sortedOptions.map((option) => {
              const isEditing = editingId === option.id
              const isEditable = option.origen === "ENFASIS"

              if (isEditing) {
                return (
                  <div
                    key={option.id}
                    className="flex items-center gap-1 rounded-md bg-foreground/5 px-1 py-1"
                  >
                    <Input
                      autoFocus
                      maxLength={130}
                      value={editingName}
                      onChange={(e) => setEditingName(toPeriodoTextInput(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          saveEdit()
                        }
                      }}
                      className="h-7 min-w-0 flex-1 px-2 text-sm"
                    />
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            color="primary"
                            size="icon-xs"
                            className="size-5 [&_svg:not([class*='size-'])]:size-3"
                            aria-label="Guardar cambios"
                            disabled={updateEnfasis.isPending || !editingName.trim()}
                            onClick={saveEdit}
                          />
                        }
                      >
                        {updateEnfasis.isPending ? (
                          <SpinnerIcon className="animate-spin" />
                        ) : (
                          <CheckIcon />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>Guardar cambios</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            className="size-5 [&_svg:not([class*='size-'])]:size-3"
                            aria-label="Cancelar edición"
                            onClick={() => setEditingId(null)}
                          />
                        }
                      >
                        <XIcon />
                      </TooltipTrigger>
                      <TooltipContent>Cancelar edición</TooltipContent>
                    </Tooltip>
                  </div>
                )
              }

              return (
                // Las acciones se montan sobre el lugar del check: el check queda
                // siempre al borde derecho.
                <div
                  key={option.id}
                  className="group relative flex min-w-0 items-center rounded-md text-sm hover:bg-foreground/10 has-[button:focus-visible]:bg-foreground/10"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.label)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left outline-none",
                      option.label === value && "font-medium text-primary",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate" title={option.label}>{option.label}</span>
                    {option.label === value && (
                      <CheckIcon
                        className={cn(
                          "size-4 shrink-0",
                          isEditable &&
                            "group-hover:opacity-0 group-has-[button:focus-visible]:opacity-0 [@media(hover:none)]:opacity-0",
                        )}
                      />
                    )}
                  </button>
                  {isEditable && (
                    // Solo al pasar el mouse o con foco; en pantallas táctiles siempre visibles.
                    <div className="absolute right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-has-[button:focus-visible]:opacity-100 [@media(hover:none)]:opacity-100">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              color="neutral"
                              size="icon-xs"
                              className="size-5 [&_svg:not([class*='size-'])]:size-3"
                              aria-label={`Editar ${option.label}`}
                              onClick={() => startEdit(option.id, option.label)}
                            />
                          }
                        >
                          <PencilIcon />
                        </TooltipTrigger>
                        <TooltipContent>{`Editar ${option.label}`}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              color="neutral"
                              size="icon-xs"
                              className="size-5 [&_svg:not([class*='size-'])]:size-3"
                              aria-label={`Eliminar ${option.label}`}
                              disabled={deleteEnfasis.isPending}
                              onClick={() => deleteEnfasis.mutate(option.id)}
                            />
                          }
                        >
                          <TrashIcon />
                        </TooltipTrigger>
                        <TooltipContent>{`Eliminar ${option.label}`}</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              )
            })}

          </div>

          <div className="border-t border-border p-1.5">
              <InputGroup className="h-8 rounded-md border border-input hover:border-ring has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
                <InputGroupInput
                  value={nuevo}
                  maxLength={130}
                  onChange={(e) => setNuevo(toPeriodoTextInput(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      agregar()
                    }
                  }}
                  placeholder="Agregar otro"
                  aria-label="Nuevo énfasis"
                  className="text-sm"
                />
                <InputGroupAddon align="inline-end" className="gap-1.5 pr-0.5">
                  <span aria-hidden className="text-xs text-muted-foreground tabular-nums">
                    {nuevo.length} / 130
                  </span>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          // Discreto hasta que hay texto: deshabilitado no parece un botón activo.
                          variant={nuevo.trim() ? "fill" : "ghost"}
                          color={nuevo.trim() ? "primary" : "neutral"}
                          size="icon-xs"
                          className="size-6"
                          aria-label="Agregar énfasis"
                          disabled={!nuevo.trim() || createEnfasis.isPending}
                          onClick={agregar}
                        />
                      }
                    >
                      {createEnfasis.isPending ? (
                        <SpinnerIcon className="animate-spin" />
                      ) : (
                        <PlusIcon weight="bold" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>Agregar énfasis</TooltipContent>
                  </Tooltip>
                </InputGroupAddon>
              </InputGroup>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
