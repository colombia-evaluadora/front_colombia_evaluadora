import { useEffect, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, SpinnerIcon, TrashIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"

import { useSaveMenu } from "../api/mutations/save-menu"
import { useCreatePlan, usePlansQuery } from "../api/query/use-plans-query"
import type { MenuNode, MenuTreeNode } from "../api/types/role-menu"

// Los `value` de un select son strings y el vacío significa "sin elegir", así
// que "menú principal" (sin padre) necesita su propio valor.
const ROOT = "root"

interface Draft {
  key: number
  name: string
  path: string
  visible: boolean
  planId: string
}

let draftKey = 0
function emptyDraft(): Draft {
  draftKey += 1
  return { key: draftKey, name: "", path: "", visible: true, planId: "" }
}

/**
 * Select de plan con alta al pie, igual que el de roles: crear un plan es
 * parte del mismo flujo y mandar al usuario a otra pantalla lo cortaría.
 */
function PlanSelect({ value, onChange }: { value: string; onChange: (planId: string) => void }) {
  const { data: plans = [] } = usePlansQuery()
  const [newPlanName, setNewPlanName] = useState("")
  const createPlan = useCreatePlan({
    mutationConfig: {
      onSuccess: (plan) => {
        setNewPlanName("")
        onChange(String(plan.id))
      },
    },
  })

  return (
    <Select value={value} onValueChange={(next) => next && onChange(String(next))}>
      <SelectTrigger aria-label="Plan">
        <SelectValue>
          {(current) => plans.find((plan) => String(plan.id) === current)?.name ?? "Seleccione"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {plans.map((plan) => (
            <SelectItem key={plan.id} value={String(plan.id)}>
              {plan.name}
            </SelectItem>
          ))}
        </SelectGroup>
        <div
          className="flex items-center gap-2 border-t border-border p-2"
          onKeyDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Input
            aria-label="Nombre del nuevo plan"
            placeholder="Agregar"
            className="h-9"
            value={newPlanName}
            onChange={(event) => setNewPlanName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                createPlan.mutate({ name: newPlanName })
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            disabled={newPlanName.trim().length === 0 || createPlan.isPending}
            onClick={() => createPlan.mutate({ name: newPlanName })}
          >
            <span className="sr-only">Crear plan</span>
            <ControlPointIcon />
          </Button>
        </div>
      </SelectContent>
    </Select>
  )
}

interface DialogSaveMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Menús raíz: los candidatos a padre. */
  roots: MenuTreeNode[]
  /** Presente = edición de ese menú; ausente = alta. */
  menu?: MenuNode
}

/**
 * Alta y edición de menús.
 *
 * En alta el diálogo hace dos cosas a la vez, que es como se usa: Eliges el
 * menú padre —o "Crear nuevo menú principal", y ahí pedimos sus datos— y
 * cargas de una varios submenús. En edición se muestra solo el menú elegido.
 */
export function DialogSaveMenu({ open, onOpenChange, roots, menu }: DialogSaveMenuProps) {
  const isEditing = menu != null
  const { notify } = useNotify()

  const [parent, setParent] = useState<string>(ROOT)
  const [name, setName] = useState("")
  const [path, setPath] = useState("")
  const [drafts, setDrafts] = useState<Draft[]>([])

  useEffect(() => {
    if (!open) return
    setParent(menu?.idParent != null ? String(menu.idParent) : ROOT)
    setName(menu?.name ?? "")
    setPath(menu?.path ?? "")
    setDrafts([])
  }, [open, menu])

  const saveMenu = useSaveMenu()

  // Un menú no puede colgar de sí mismo.
  const parentOptions = roots.filter((root) => root.id !== menu?.id)
  const isNewRoot = parent === ROOT
  const idParent = isNewRoot ? null : Number(parent)

  const filledDrafts = drafts.filter(
    (draft) => draft.name.trim().length > 0 && draft.path.trim().length > 0,
  )
  const rootIsValid = name.trim().length > 0 && path.trim().length > 0
  const canSave = isEditing
    ? rootIsValid
    : (isNewRoot ? rootIsValid : true) && (isNewRoot || filledDrafts.length > 0)

  function updateDraft(key: number, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  }

  async function handleSubmit() {
    try {
      if (isEditing) {
        await saveMenu.mutateAsync({ id: menu.id, name, path, icon: menu.icon, idParent })
      } else {
        // El padre primero: los submenús necesitan su id.
        const parentId = isNewRoot
          ? (await saveMenu.mutateAsync({ name, path, icon: "", idParent: null })).id
          : idParent
        for (const draft of filledDrafts) {
          await saveMenu.mutateAsync({
            name: draft.name,
            path: draft.path,
            icon: "",
            idParent: parentId,
            visible: draft.visible,
            planId: draft.planId ? Number(draft.planId) : null,
          })
        }
      }
      onOpenChange(false)
      notify(isEditing ? "El menú se actualizó correctamente." : "El menú se creó correctamente.")
    } catch {
      // El interceptor de `api` ya muestra el error del backend.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar menú" : "Agregar menú"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field variant="outlined">
            <FieldLabel htmlFor="menu-parent">Menú padre</FieldLabel>
            <Select value={parent} onValueChange={(value) => value && setParent(String(value))}>
              <SelectTrigger id="menu-parent">
                <SelectValue>
                  {(value) =>
                    value === ROOT
                      ? "Crear nuevo menú principal"
                      : (parentOptions.find((root) => String(root.id) === value)?.name ??
                        "Seleccionar")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT}>
                  <ControlPointIcon data-icon="inline-start" />
                  Crear nuevo menú principal
                </SelectItem>
                <SelectSeparator />
                <SelectGroup>
                  {parentOptions.map((root) => {
                    const Icon = getNavIcon(root.icon)
                    return (
                      <SelectItem key={root.id} value={String(root.id)}>
                        <Icon data-icon="inline-start" />
                        {root.name}
                      </SelectItem>
                    )
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          {(isNewRoot || isEditing) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field variant="outlined">
                <FieldLabel htmlFor="menu-name">Nombre*</FieldLabel>
                <Input
                  id="menu-name"
                  placeholder="Agregar"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              <Field variant="outlined">
                <FieldLabel htmlFor="menu-path">Ruta*</FieldLabel>
                <Input
                  id="menu-path"
                  placeholder="Agregar"
                  value={path}
                  onChange={(event) => setPath(event.target.value)}
                />
              </Field>
            </div>
          )}

          {!isEditing && (
            <section className="rounded-lg border border-border p-4">
              <header className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">Submenús</h3>
                <Button
                  type="button"
                  size="icon"
                  onClick={() => setDrafts((prev) => [...prev, emptyDraft()])}
                >
                  <span className="sr-only">Agregar submenú</span>
                  <ControlPointIcon />
                </Button>
              </header>

              {drafts.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  {/* Encabezados una sola vez, como una tabla: repetir la
                      etiqueta en cada fila ensucia y desalinea las columnas.
                      Cada control lleva su `aria-label` para el lector. */}
                  <div className="grid min-w-[34rem] grid-cols-[1fr_1fr_7rem_9rem_auto] gap-2 text-sm font-semibold">
                    <span>Nombre del menú*</span>
                    <span>URL*</span>
                    <span>Visible</span>
                    <span>Plan</span>
                    <span className="sr-only">Acciones</span>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {drafts.map((draft) => (
                      <li
                        key={draft.key}
                        className="mt-2 grid min-w-[34rem] grid-cols-[1fr_1fr_7rem_9rem_auto] items-center gap-2"
                      >
                        <Input
                          aria-label="Nombre del menú"
                          placeholder="Agregar"
                          value={draft.name}
                          onChange={(event) => updateDraft(draft.key, { name: event.target.value })}
                        />
                        <Input
                          aria-label="URL"
                          placeholder="Agregar"
                          value={draft.path}
                          onChange={(event) => updateDraft(draft.key, { path: event.target.value })}
                        />
                        <Select
                          value={draft.visible ? "si" : "no"}
                          onValueChange={(value) =>
                            value && updateDraft(draft.key, { visible: value === "si" })
                          }
                        >
                          <SelectTrigger aria-label="Visible">
                            <SelectValue>{(value) => (value === "no" ? "No" : "Si")}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="si">Si</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <PlanSelect
                          value={draft.planId}
                          onChange={(planId) => updateDraft(draft.key, { planId })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDrafts((prev) => prev.filter((it) => it.key !== draft.key))
                          }
                        >
                          <span className="sr-only">Quitar submenú</span>
                          <TrashIcon />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>

        <DialogFooter>
          <Button
            size="sm"
            type="button"
            disabled={!canSave || saveMenu.isPending}
            aria-busy={saveMenu.isPending}
            onClick={handleSubmit}
          >
            {saveMenu.isPending && (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            )}
            Guardar
          </Button>
          <DialogClose render={<Button size="sm" type="button" variant="fill" color="neutral" />}>
            Cancelar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
