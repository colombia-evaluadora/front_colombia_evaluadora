import { useMemo, useState } from "react"

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
import { cn } from "@/lib/utils"

import { useEspecialidadesQuery } from "@/features/establishment/academic-period/api/query/use-especialidades"
import { useCreateEnfasis } from "@/features/establishment/academic-period/api/mutations/create-enfasis"
import { useUpdateEnfasis } from "@/features/establishment/academic-period/api/mutations/update-enfasis"
import { useDeleteEnfasis } from "@/features/establishment/academic-period/api/mutations/delete-enfasis"

interface EspecialidadSelectProps {
  value: string
  academicPeriodId?: number
  onChange: (value: string) => void
}

// Especialidad (fija) vs énfasis (lo crea el usuario a nivel de
// establecimiento): mismo select, pero solo el énfasis se puede editar/borrar
// — se distinguen por `origen`.
export function EspecialidadSelect({
  value,
  academicPeriodId,
  onChange,
}: EspecialidadSelectProps) {
  const [open, setOpen] = useState(false)
  const [nuevo, setNuevo] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const resolvedVariant = useInputVariant()

  const { data: options = [] } = useEspecialidadesQuery(academicPeriodId)

  // El back devuelve especialidades fijas y énfasis mezclados en el orden
  // que resuelve `fn_especialidad_enfasis_listar` (sin garantía de agrupación).
  // Para que la lista sea predecible, fijamos: primero las ESPECIALIDAD (el
  // catálogo global, en su orden original), después los ENFASIS del
  // establecimiento. Ambos bloques mantienen el orden interno que devolvió
  // el back.
  //
  // Además, filtramos los énfasis cuyo `nombre` está vacío o es solo dígitos
  // — son "huérfanos" creados por la lógica vieja que mandaba el id en vez
  // del nombre (ver to-asignaturas-payload.ts:7-13). El back filtra los que
  // matchean con una especialidad (para que el usuario no note el énfasis
  // espejo), pero deja pasar los huérfanos porque su nombre no es texto
  // legible — no los queremos en el popover: la fila no aporta info al
  // usuario y los botones de editar/borrar quedan sobre una opción fantasma.
  const sortedOptions = useMemo(() => {
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
  }, [options])

  const createEnfasis = useCreateEnfasis({
    mutationConfig: {
      onSuccess: () => {
        onChange(nuevo.trim())
        setNuevo("")
      },
    },
  })
  const updateEnfasis = useUpdateEnfasis({
    mutationConfig: {
      onSuccess: (_id, variables) => {
        if (value === options.find((o) => o.id === editingId)?.label) {
          onChange(variables.nombre)
        }
        setEditingId(null)
      },
    },
  })
  const deleteEnfasis = useDeleteEnfasis({
    mutationConfig: {
      onSuccess: (_result, id) => {
        const removed = options.find((o) => o.id === id)
        if (removed && value === removed.label) onChange("")
      },
    },
  })

  function agregar() {
    const nombre = nuevo.trim()
    if (!nombre || academicPeriodId == null) return
    createEnfasis.mutate({ academicPeriodId, nombre })
  }

  function startEdit(id: number, currentName: string) {
    setEditingId(id)
    setEditingName(currentName)
  }

  function saveEdit() {
    if (editingId == null || !editingName.trim()) return
    updateEnfasis.mutate({ id: editingId, nombre: editingName.trim() })
  }

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
        <CaretDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        <div className="flex flex-col">
          {sortedOptions.map((option) => {
            const isEditing = editingId === option.id
            const isEditable = option.origen === "ENFASIS"

            if (isEditing) {
              return (
                <div key={option.id} className="flex items-center gap-1 px-1 py-1">
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        saveEdit()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    color="primary"
                    size="icon-sm"
                    aria-label="Guardar cambios"
                    disabled={updateEnfasis.isPending || !editingName.trim()}
                    onClick={saveEdit}
                  >
                    {updateEnfasis.isPending ? (
                      <SpinnerIcon className="animate-spin" />
                    ) : (
                      <CheckIcon />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Cancelar edición"
                    onClick={() => setEditingId(null)}
                  >
                    <XIcon />
                  </Button>
                </div>
              )
            }

            return (
              <div
                key={option.id}
                className="hover:bg-foreground/10 flex items-center justify-between gap-2 rounded-none border-b border-border px-2 py-1 text-sm last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.label)
                    setOpen(false)
                  }}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.label === value && <CheckIcon className="size-4 shrink-0" />}
                </button>
                {isEditable && (
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      color="neutral"
                      size="icon-xs"
                      className="size-5 [&_svg:not([class*='size-'])]:size-3"
                      aria-label={`Editar ${option.label}`}
                      onClick={() => startEdit(option.id, option.label)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      color="neutral"
                      size="icon-xs"
                      className="size-5 [&_svg:not([class*='size-'])]:size-3"
                      aria-label={`Eliminar ${option.label}`}
                      disabled={deleteEnfasis.isPending}
                      onClick={() => deleteEnfasis.mutate(option.id)}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                )}
              </div>
            )
          })}

          <div className="px-2 pt-1">
            <InputGroup className="h-10 rounded-md border border-input px-1 hover:border-ring has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
              <InputGroupInput
                value={nuevo}
                onChange={(e) => setNuevo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    agregar()
                  }
                }}
                placeholder="Agregar otro"
                aria-label="Nuevo énfasis"
              />
              <InputGroupAddon align="inline-end">
                <Button
                  type="button"
                  color="primary"
                  size="icon-sm"
                  aria-label="Agregar énfasis"
                  disabled={!nuevo.trim() || createEnfasis.isPending}
                  onClick={agregar}
                >
                  {createEnfasis.isPending ? (
                    <SpinnerIcon className="animate-spin" />
                  ) : (
                    <PlusIcon weight="bold" />
                  )}
                </Button>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
