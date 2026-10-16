import { useEffect, useRef, useState } from "react"
import { z } from "zod"

import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, SpinnerIcon } from "@/components/ui/icons"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { Input } from "@/components/ui/input"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxSeparator,
} from "@/components/ui/combobox"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"

import { useDeleteMenu } from "@/features/administration/roles-menus/api/mutations/delete-menu"
import { useSaveMenu } from "@/features/administration/roles-menus/api/mutations/save-menu"
import { useSetMenuActions } from "@/features/administration/roles-menus/api/mutations/set-menu-actions"
import type { MenuActions } from "@/features/administration/roles-menus/api/mutations/set-menu-actions"
import { Switch } from "@/components/ui/switch"
import {
  useCreatePlan,
  usePlansQuery,
} from "@/features/administration/roles-menus/api/query/use-plans-query"
import type {
  MenuCatalogNode,
  MenuNode,
  MenuTreeNode,
} from "@/features/administration/roles-menus/api/types/role-menu"

// Valor propio para "menú principal": el vacío del select significa "sin elegir".
const ROOT = "root"

// El backend guarda el ícono por nombre (la misma clave que resuelve `getNavIcon`).
const MENU_ICONS = [
  { value: "Book-Open-Icon", label: "Libro" },
  { value: "Graduation-Cap-Icon", label: "Académico" },
  { value: "Users-Icon", label: "Usuarios" },
  { value: "Admin-Panel-Settings-Icon", label: "Administración" },
  { value: "Bank-Icon", label: "Institución" },
  { value: "House-Icon", label: "Inicio" },
  { value: "Calendar-Icon", label: "Calendario" },
  { value: "Clipboard-Text-Icon", label: "Formularios" },
  { value: "Chart-Line-Up-Icon", label: "Reportes" },
  { value: "Identification-Card-Icon", label: "Identificación" },
  { value: "Map-Trifold-Icon", label: "Mapa" },
  { value: "Gear-Icon", label: "Configuración" },
] as const

interface Draft {
  key: number
  /** Presente = submenú que YA existe: se guarda con PATCH, no como alta. */
  id?: number
  name: string
  path: string
  visible: boolean
  planId: string
  guardar: boolean
  eliminar: boolean
}

function emptyDraft(key: number): Draft {
  return { key, name: "", path: "", visible: true, planId: "", guardar: true, eliminar: true }
}

function actionsOf(menu: MenuNode): MenuActions {
  const catalog = menu as Partial<MenuCatalogNode>
  return { guardar: catalog.admiteGuardar ?? true, eliminar: catalog.admiteEliminar ?? true }
}

function draftFromMenu(child: MenuNode, key: number): Draft {
  return {
    key,
    id: child.id,
    name: child.name,
    path: child.path ?? "",
    visible: child.visible ?? true,
    planId: child.planId != null ? String(child.planId) : "",
    ...actionsOf(child),
  }
}

/** Evita un PATCH por cada hijo que nadie tocó. */
function isUnchanged(draft: Draft, child: MenuNode) {
  return (
    draft.name === child.name &&
    draft.path === (child.path ?? "") &&
    draft.visible === (child.visible ?? true) &&
    draft.planId === (child.planId != null ? String(child.planId) : "")
  )
}

function sameActions(a: MenuActions, b: MenuActions) {
  return a.guardar === b.guardar && a.eliminar === b.eliminar
}

function PlanSelect({
  id,
  value,
  onChange,
}: {
  id?: string
  value: string
  onChange: (planId: string) => void
}) {
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
  const planError = createPlan.error ? getErrorMessage(createPlan.error) : null

  return (
    <Select value={value} onValueChange={(next) => next && onChange(String(next))}>
      <SelectTrigger id={id} variant="outlined" aria-label="Plan">
        <SelectValue>
          {(current) => plans.find((plan) => String(plan.id) === current)?.name ?? "Seleccione"}
        </SelectValue>
      </SelectTrigger>
      {/* Popup más ancho que el trigger: en la columna Plan no entra el alta. */}
      <SelectContent className="w-auto min-w-72">
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
            variant="outlined"
            aria-label="Nombre del nuevo plan"
            placeholder="Agregar"
            className="h-10"
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
        {planError && (
          <p role="alert" className="text-destructive px-2 pb-2 text-xs">
            {planError}
          </p>
        )}
      </SelectContent>
    </Select>
  )
}

const newRootSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre del menú."),
  icon: z.string().trim().min(1, "Elige un ícono."),
})

const editMenuSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre del menú."),
  path: z.string().trim().min(1, "Ingresa la ruta del menú."),
})

interface DialogSaveMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roots: MenuTreeNode[]
  /** Presente = edición; con `children` si es carpeta, para listar sus submenús. */
  menu?: MenuNode | MenuTreeNode
}

/** Alta (padre + varios submenús de una) y edición de un menú. */
export function DialogSaveMenu({ open, onOpenChange, roots, menu }: DialogSaveMenuProps) {
  const isEditing = menu != null
  const { notify } = useNotify()

  // En alta el padre decide qué campos aplican: el resto no aparece hasta elegirlo.
  const [parent, setParent] = useState<string>("")
  const [name, setName] = useState("")
  const [path, setPath] = useState("")
  const [icon, setIcon] = useState("")
  const [visible, setVisible] = useState(true)
  const [planId, setPlanId] = useState("")
  const [actions, setActions] = useState<MenuActions>({ guardar: true, eliminar: true })
  const [drafts, setDrafts] = useState<Draft[]>([])
  // Se pide fuera de los updaters de `setDrafts`: StrictMode los invoca dos veces.
  const draftKeyRef = useRef(0)
  function nextDraftKey() {
    draftKeyRef.current += 1
    return draftKeyRef.current
  }
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setParent(menu == null ? "" : menu.idParent != null ? String(menu.idParent) : ROOT)
    setName(menu?.name ?? "")
    setPath(menu?.path ?? "")
    setIcon(menu?.icon ?? "")
    // Los menús viejos no traen `visible`: se asumen visibles.
    setVisible(menu?.visible ?? true)
    setPlanId(menu?.planId != null ? String(menu.planId) : "")
    setActions(menu ? actionsOf(menu) : { guardar: true, eliminar: true })
    setDrafts(
      menu != null && menu.idParent == null && "children" in menu
        ? menu.children.map((child) => draftFromMenu(child, nextDraftKey()))
        : [],
    )
    setFieldErrors({})
    setSaveError(null)
  }, [open, menu])

  const [saveError, setSaveError] = useState<string | null>(null)
  const saveMenu = useSaveMenu()
  const setMenuActions = useSetMenuActions()
  const deleteMenu = useDeleteMenu({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") setSaveError(result.message)
      },
      onError: (error) => setSaveError(getErrorMessage(error)),
    },
  })

  const existingChildren = menu != null && "children" in menu ? menu.children : []

  const parentOptions = roots.filter((root) => root.id !== menu?.id)
  const isNewRoot = parent === ROOT
  const hasParentChoice = parent !== ""
  const idParent = isNewRoot ? null : Number(parent)

  // La carpeta no lleva ruta propia (hereda la del primer submenú) ni plan; el submenú no lleva ícono.
  // `== null`: un menú principal puede llegar con `idParent` ausente.
  const isRootMenu = isEditing ? menu.idParent == null : isNewRoot
  const showSubmenus = isEditing ? isRootMenu : hasParentChoice

  const filledDrafts = drafts.filter(
    (draft) => draft.name.trim().length > 0 && draft.path.trim().length > 0,
  )
  // Colgando de un menú existente hay que cargar al menos un submenú; el resto se valida al guardar.
  const canSave = isEditing || (hasParentChoice && (isNewRoot || filledDrafts.length > 0))

  function updateDraft(key: number, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  }

  /** La fila nueva sale del form; la existente se da de baja en el backend. */
  function removeDraft(draft: Draft) {
    if (draft.id != null) deleteMenu.mutate({ id: draft.id })
    setDrafts((prev) => prev.filter((it) => it.key !== draft.key))
  }

  async function saveDraftActions(id: number, draft: Draft, original?: MenuNode) {
    const current = original ? actionsOf(original) : { guardar: true, eliminar: true }
    if (sameActions(draft, current)) return
    await setMenuActions.mutateAsync({ id, guardar: draft.guardar, eliminar: draft.eliminar })
  }

  async function handleSubmit() {
    // Colgando de un menú existente, sus datos los aportan los submenús.
    if (isNewRoot || isEditing) {
      const parsed = isRootMenu
        ? newRootSchema.safeParse({ name, icon })
        : editMenuSchema.safeParse({ name, path })

      if (!parsed.success) {
        const nextErrors: Record<string, string> = {}
        for (const issue of parsed.error.issues) {
          nextErrors[issue.path.join(".")] ??= issue.message
        }
        setFieldErrors(nextErrors)
        return
      }
    }

    setFieldErrors({})
    setSaveError(null)

    try {
      if (isEditing) {
        await saveMenu.mutateAsync({
          id: menu.id,
          name,
          path: isRootMenu ? path || filledDrafts[0]?.path || "" : path,
          icon: isRootMenu ? icon : (menu.icon ?? ""),
          idParent,
          visible,
          // Mandar `planId` en `null` en la carpeta le borraría el plan.
          ...(isRootMenu ? {} : { planId: planId ? Number(planId) : null }),
        })
        if (!isRootMenu && !sameActions(actions, actionsOf(menu))) {
          await setMenuActions.mutateAsync({ id: menu.id, ...actions })
        }
        // Los submenús que nadie tocó no se mandan.
        for (const draft of filledDrafts) {
          const original = existingChildren.find((child) => child.id === draft.id)
          const id =
            original && isUnchanged(draft, original)
              ? original.id
              : (
                  await saveMenu.mutateAsync({
                    id: draft.id,
                    name: draft.name,
                    path: draft.path,
                    icon: "",
                    idParent: menu.id,
                    visible: draft.visible,
                    planId: draft.planId ? Number(draft.planId) : null,
                  })
                ).id
          await saveDraftActions(id, draft, original)
        }
      } else {
        // El padre primero: los submenús necesitan su id, y él hereda la ruta del primero.
        const parentId = isNewRoot
          ? (
              await saveMenu.mutateAsync({
                name,
                path: filledDrafts[0]?.path ?? "",
                icon,
                idParent: null,
                visible,
              })
            ).id
          : idParent
        for (const draft of filledDrafts) {
          const created = await saveMenu.mutateAsync({
            name: draft.name,
            path: draft.path,
            icon: "",
            idParent: parentId,
            visible: draft.visible,
            planId: draft.planId ? Number(draft.planId) : null,
          })
          await saveDraftActions(created.id, draft)
        }
      }
      onOpenChange(false)
      notify(isEditing ? "El menú se actualizó correctamente." : "El menú se creó correctamente.")
    } catch (error) {
      // El NoticeProvider apaga el toast global: el error va al banner del diálogo.
      setSaveError(getErrorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[85vh] flex-col overflow-hidden p-0",
          hasParentChoice ? "sm:max-w-2xl" : "sm:max-w-sm",
        )}
        // Sin padre elegido no hay footer: la X es la única forma de cerrar.
        showCloseButton={!hasParentChoice}
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>{isEditing ? "Editar menú" : "Agregar menú"}</DialogTitle>
          {saveError && (
            <p role="alert" className="text-destructive text-sm">
              {saveError}
            </p>
          )}
        </DialogHeader>

        <div
          className={cn(
            "scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 flex min-w-0 flex-col gap-4",
            // Sin footer, este div es el último y necesita su propio `pb-6`.
            !hasParentChoice && "pb-6",
          )}
        >
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
            <Field variant="outlined" className={hasParentChoice ? "" : "sm:col-span-2"}>
              <FieldLabel htmlFor="menu-parent">Menú padre</FieldLabel>
              <ComboboxField value={parent} onValueChange={(value) => value && setParent(String(value))}>
                <ComboboxFieldTrigger id="menu-parent">
                  <ComboboxFieldValue>
                    {(value) =>
                      value === ROOT
                        ? "Crear nuevo menú principal"
                        : (parentOptions.find((root) => String(root.id) === value)?.name ??
                          "Seleccionar")
                    }
                  </ComboboxFieldValue>
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  {/* `ItemText` es display:block (para el "…"): el ícono necesita su propio flex. */}
                  <ComboboxFieldItem value={ROOT}>
                    <span className="flex items-center gap-2">
                      <ControlPointIcon />
                      Crear nuevo menú principal
                    </span>
                  </ComboboxFieldItem>
                  <ComboboxSeparator />
                  {/* Sin `ComboboxGroup`: su `p-1.5` indentaba los menús respecto del item de arriba. */}
                  {parentOptions.map((root) => {
                    const Icon = getNavIcon(root.icon)
                    return (
                      <ComboboxFieldItem key={root.id} value={String(root.id)}>
                        <span className="flex items-center gap-2">
                          <Icon />
                          <span className="truncate">{root.name}</span>
                        </span>
                      </ComboboxFieldItem>
                    )
                  })}
                </ComboboxFieldContent>
              </ComboboxField>
            </Field>
          </div>

          {isRootMenu && (
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-[1fr_10rem_10rem]">
              <Field variant="outlined" data-invalid={fieldErrors["name"] ? "true" : undefined}>
                <FieldLabel htmlFor="menu-name">Nombre del menú*</FieldLabel>
                <Input
                  id="menu-name"
                  placeholder="Agregar"
                  value={name}
                  aria-invalid={Boolean(fieldErrors["name"])}
                  onChange={(event) => setName(event.target.value)}
                />
                <FieldError>{fieldErrors["name"]}</FieldError>
              </Field>
              <Field variant="outlined" data-invalid={fieldErrors["icon"] ? "true" : undefined}>
                <FieldLabel htmlFor="menu-icon">Icono*</FieldLabel>
                <ComboboxField value={icon} onValueChange={(value) => value && setIcon(String(value))}>
                  <ComboboxFieldTrigger id="menu-icon" aria-invalid={Boolean(fieldErrors["icon"])}>
                    <ComboboxFieldValue>
                      {(value) => {
                        const option = MENU_ICONS.find((it) => it.value === value)
                        if (!option) return "Seleccione"
                        const Icon = getNavIcon(option.value)
                        return (
                          <span className="flex items-center gap-2">
                            <Icon />
                            <span className="truncate">{option.label}</span>
                          </span>
                        )
                      }}
                    </ComboboxFieldValue>
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    {MENU_ICONS.map((option) => {
                      const Icon = getNavIcon(option.value)
                      return (
                        <ComboboxFieldItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <Icon />
                            <span className="truncate">{option.label}</span>
                          </span>
                        </ComboboxFieldItem>
                      )
                    })}
                  </ComboboxFieldContent>
                </ComboboxField>
                <FieldError>{fieldErrors["icon"]}</FieldError>
              </Field>
              <Field variant="outlined">
                <FieldLabel htmlFor="menu-visible">Visible</FieldLabel>
                <ComboboxField
                  value={visible ? "si" : "no"}
                  onValueChange={(value) => value && setVisible(value === "si")}
                >
                  <ComboboxFieldTrigger id="menu-visible">
                    <ComboboxFieldValue>{(value) => (value === "no" ? "No" : "Si")}</ComboboxFieldValue>
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    <ComboboxFieldItem value="si">Si</ComboboxFieldItem>
                    <ComboboxFieldItem value="no">No</ComboboxFieldItem>
                  </ComboboxFieldContent>
                </ComboboxField>
              </Field>
            </div>
          )}

          {isEditing && !isRootMenu && (
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              <Field variant="outlined" data-invalid={fieldErrors["name"] ? "true" : undefined}>
                <FieldLabel htmlFor="menu-name">Nombre*</FieldLabel>
                <Input
                  id="menu-name"
                  placeholder="Agregar"
                  value={name}
                  aria-invalid={Boolean(fieldErrors["name"])}
                  onChange={(event) => setName(event.target.value)}
                />
                <FieldError>{fieldErrors["name"]}</FieldError>
              </Field>
              <Field variant="outlined" data-invalid={fieldErrors["path"] ? "true" : undefined}>
                <FieldLabel htmlFor="menu-path">Ruta*</FieldLabel>
                <Input
                  id="menu-path"
                  placeholder="Agregar"
                  value={path}
                  aria-invalid={Boolean(fieldErrors["path"])}
                  onChange={(event) => setPath(event.target.value)}
                />
                <FieldError>{fieldErrors["path"]}</FieldError>
              </Field>
              <Field variant="outlined">
                <FieldLabel htmlFor="menu-edit-visible">Visible</FieldLabel>
                <ComboboxField
                  value={visible ? "si" : "no"}
                  onValueChange={(value) => value && setVisible(value === "si")}
                >
                  <ComboboxFieldTrigger id="menu-edit-visible">
                    <ComboboxFieldValue>{(value) => (value === "no" ? "No" : "Si")}</ComboboxFieldValue>
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    <ComboboxFieldItem value="si">Si</ComboboxFieldItem>
                    <ComboboxFieldItem value="no">No</ComboboxFieldItem>
                  </ComboboxFieldContent>
                </ComboboxField>
              </Field>
              <Field variant="outlined">
                <FieldLabel htmlFor="menu-edit-plan">Plan</FieldLabel>
                <PlanSelect id="menu-edit-plan" value={planId} onChange={setPlanId} />
              </Field>
              <fieldset className="flex flex-col gap-2 sm:col-span-2">
                <legend className="mb-1 text-sm font-semibold">Acciones disponibles</legend>
                <ActionSwitch
                  id="menu-edit-guardar"
                  label="Guardar (crear y editar)"
                  checked={actions.guardar}
                  onChange={(guardar) => setActions((prev) => ({ ...prev, guardar }))}
                />
                <ActionSwitch
                  id="menu-edit-eliminar"
                  label="Eliminar"
                  checked={actions.eliminar}
                  onChange={(eliminar) => setActions((prev) => ({ ...prev, eliminar }))}
                />
              </fieldset>
            </div>
          )}

          {showSubmenus && (
            <section className="rounded-lg border border-border px-4 py-2">
              <header className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold">Submenús</h3>
                <Button
                  type="button"
                  size="icon-sm"
                  onClick={() => {
                    const draft = emptyDraft(nextDraftKey())
                    setDrafts((prev) => [...prev, draft])
                  }}
                >
                  <span className="sr-only">Agregar submenú</span>
                  <ControlPointIcon />
                </Button>
              </header>

              {drafts.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  {/* Última columna de ancho fijo: con `auto` el `sr-only` del encabezado no mide y los títulos se corren. */}
                  <div className="grid min-w-[44rem] grid-cols-[1fr_1fr_7rem_9rem_4rem_4rem_2.5rem] gap-2 text-sm font-semibold">
                    <span>Nombre del menú*</span>
                    <span>URL*</span>
                    <span>Visible</span>
                    <span>Plan</span>
                    <span>Guardar</span>
                    <span>Eliminar</span>
                    <span className="sr-only">Quitar</span>
                  </div>
                  <ul className="mt-2 flex flex-col gap-2">
                    {drafts.map((draft) => (
                      <li
                        key={draft.key}
                        className="grid min-w-[44rem] grid-cols-[1fr_1fr_7rem_9rem_4rem_4rem_2.5rem] items-center gap-2"
                      >
                        <Input
                          variant="outlined"
                          aria-label="Nombre del menú"
                          placeholder="Agregar"
                          value={draft.name}
                          onChange={(event) => updateDraft(draft.key, { name: event.target.value })}
                        />
                        <Input
                          variant="outlined"
                          aria-label="URL"
                          placeholder="Agregar"
                          value={draft.path}
                          onChange={(event) => updateDraft(draft.key, { path: event.target.value })}
                        />
                        <ComboboxField
                          value={draft.visible ? "si" : "no"}
                          onValueChange={(value) =>
                            value && updateDraft(draft.key, { visible: value === "si" })
                          }
                        >
                          <ComboboxFieldTrigger variant="outlined" aria-label="Visible">
                            <ComboboxFieldValue>{(value) => (value === "no" ? "No" : "Si")}</ComboboxFieldValue>
                          </ComboboxFieldTrigger>
                          <ComboboxFieldContent>
                            <ComboboxFieldItem value="si">Si</ComboboxFieldItem>
                            <ComboboxFieldItem value="no">No</ComboboxFieldItem>
                          </ComboboxFieldContent>
                        </ComboboxField>
                        <PlanSelect
                          value={draft.planId}
                          onChange={(planId) => updateDraft(draft.key, { planId })}
                        />
                        <Switch
                          round
                          aria-label="Admite guardar"
                          checked={draft.guardar}
                          onCheckedChange={(guardar) => updateDraft(draft.key, { guardar })}
                        />
                        <Switch
                          round
                          aria-label="Admite eliminar"
                          checked={draft.eliminar}
                          onCheckedChange={(eliminar) => updateDraft(draft.key, { eliminar })}
                        />
                        <ConfirmRemoveButton
                          label={draft.id != null ? "Eliminar submenú" : "Quitar submenú"}
                          size="icon"
                          // El borrado del backend es en cascada, así que el aviso lo dice.
                          description={
                            draft.id != null
                              ? `Se eliminará el submenú «${draft.name}» de todos los roles que lo tengan. Esta acción no se puede deshacer.`
                              : draft.name.trim()
                                ? `Se quitará el submenú «${draft.name}». Esta acción no se puede deshacer.`
                                : "Se quitará el submenú. Esta acción no se puede deshacer."
                          }
                          onConfirm={() => removeDraft(draft)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>

        {hasParentChoice && (
          <DialogFooter className="shrink-0 px-6 pb-6">
            <Button
              size="sm"
              type="button"
              disabled={!canSave || saveMenu.isPending || setMenuActions.isPending}
              aria-busy={saveMenu.isPending || setMenuActions.isPending}
              onClick={handleSubmit}
            >
              {(saveMenu.isPending || setMenuActions.isPending) && (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              )}
              Guardar
            </Button>
            <DialogClose render={<Button size="sm" type="button" variant="fill" color="neutral" />}>
              Cancelar
            </DialogClose>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ActionSwitch({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      <Switch id={id} round checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
