import { useEffect, useState } from "react"
import { z } from "zod"

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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, SpinnerIcon } from "@/components/ui/icons"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
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

import { useSaveMenu } from "@/features/administration/roles-menus/api/mutations/save-menu"
import {
  useCreatePlan,
  usePlansQuery,
} from "@/features/administration/roles-menus/api/query/use-plans-query"
import type {
  MenuNode,
  MenuTreeNode,
} from "@/features/administration/roles-menus/api/types/role-menu"

// Los `value` de un select son strings y el vacío significa "sin elegir", así
// que "menú principal" (sin padre) necesita su propio valor.
const ROOT = "root"

// Los íconos que puede llevar un menú principal. El backend los guarda por
// nombre (misma convención que `getNavIcon` resuelve), así que la lista es de
// strings y no de componentes.
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
      <SelectTrigger variant="outlined" aria-label="Plan">
        <SelectValue>
          {(current) => plans.find((plan) => String(plan.id) === current)?.name ?? "Seleccione"}
        </SelectValue>
      </SelectTrigger>
      {/* El popup no se ata al ancho del trigger: la columna Plan es angosta y
          ahí no entra el campo de alta con su botón. */}
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

/** Los campos con asterisco del menú principal nuevo. */
const newRootSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre del menú."),
  icon: z.string().trim().min(1, "Elige un ícono."),
})

/** En edición el menú ya tiene ícono y lo que se corrige es nombre y ruta. */
const editMenuSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre del menú."),
  path: z.string().trim().min(1, "Ingresa la ruta del menú."),
})

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

  // Arranca sin elegir: en alta, el menú padre es la primera decisión y de ella
  // depende qué campos tienen sentido, así que el resto del formulario no
  // aparece hasta contestarla.
  const [parent, setParent] = useState<string>("")
  const [name, setName] = useState("")
  const [path, setPath] = useState("")
  const [icon, setIcon] = useState("")
  const [visible, setVisible] = useState(true)
  const [drafts, setDrafts] = useState<Draft[]>([])
  // Mensaje por campo del menú raíz, indexado por su nombre en el esquema.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    // En edición el padre ya está definido; en alta se elige.
    setParent(menu == null ? "" : menu.idParent != null ? String(menu.idParent) : ROOT)
    setName(menu?.name ?? "")
    setPath(menu?.path ?? "")
    setIcon(menu?.icon ?? "")
    setVisible(true)
    setDrafts([])
    setFieldErrors({})
  }, [open, menu])

  const saveMenu = useSaveMenu()

  // Un menú no puede colgar de sí mismo.
  const parentOptions = roots.filter((root) => root.id !== menu?.id)
  const isNewRoot = parent === ROOT
  const hasParentChoice = parent !== ""
  const idParent = isNewRoot ? null : Number(parent)

  const filledDrafts = drafts.filter(
    (draft) => draft.name.trim().length > 0 && draft.path.trim().length > 0,
  )
  /*
   * Nombre y ruta ya no bloquean el botón: se validan al guardar y el motivo
   * aparece debajo del campo, como en el resto de los formularios. Un botón
   * deshabilitado no explica qué falta.
   *
   * Lo que sí lo bloquea es la única regla que no cuelga de un campo: colgando
   * de un menú existente hay que haber cargado al menos un submenú. Y sin menú
   * padre elegido todavía no hay nada que guardar.
   */
  const canSave = isEditing || (hasParentChoice && (isNewRoot || filledDrafts.length > 0))

  function updateDraft(key: number, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  }

  async function handleSubmit() {
    // Los datos del menú principal solo se piden cuando sus campos están a la
    // vista: colgando de un menú existente, esos datos los aportan los submenús.
    if (isNewRoot || isEditing) {
      const parsed = isEditing
        ? editMenuSchema.safeParse({ name, path })
        : newRootSchema.safeParse({ name, icon })

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

    try {
      if (isEditing) {
        await saveMenu.mutateAsync({ id: menu.id, name, path, icon: menu.icon, idParent })
      } else {
        // El padre primero: los submenús necesitan su id. Un menú principal no
        // tiene ruta propia —es un grupo—, así que hereda la del primer
        // submenú, que es a donde lleva al abrirlo.
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
      {/* Mientras la única pregunta es el menú padre, el diálogo se queda del
          ancho de esa pregunta; recién al contestarla aparecen los submenús,
          que sí necesitan las cinco columnas. */}
      <DialogContent className={hasParentChoice ? "sm:max-w-2xl" : "sm:max-w-sm"}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar menú" : "Agregar menú"}</DialogTitle>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4">
          {/* Mismo tratamiento que el diálogo de escalas de valoración: sobre la
              grilla de dos columnas, el campo ocupa el ancho entero mientras es
              la única pregunta y baja a media columna cuando el diálogo crece. */}
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
            <Field variant="outlined" className={hasParentChoice ? "" : "sm:col-span-2"}>
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
                  {/* El contenido del item vive dentro de un `ItemText` en
                      display:block —para que el texto largo termine en "…"—, así
                      que el ícono necesita su propio flex o cae a la línea de
                      arriba. */}
                  <SelectItem value={ROOT}>
                    <span className="flex items-center gap-2">
                      <ControlPointIcon />
                      Crear nuevo menú principal
                    </span>
                  </SelectItem>
                  <SelectSeparator />
                  <SelectGroup>
                    {parentOptions.map((root) => {
                      const Icon = getNavIcon(root.icon)
                      return (
                        <SelectItem key={root.id} value={String(root.id)}>
                          <span className="flex items-center gap-2">
                            <Icon />
                            <span className="truncate">{root.name}</span>
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Un menú principal es un grupo: no lleva ruta propia (la hereda de
              su primer submenú) pero sí ícono, que es lo que se ve en el
              sidebar. En edición, en cambio, se corrige la ruta del menú. */}
          {isNewRoot && (
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
                <Select value={icon} onValueChange={(value) => value && setIcon(String(value))}>
                  <SelectTrigger id="menu-icon" aria-invalid={Boolean(fieldErrors["icon"])}>
                    {/* Lo elegido se muestra con su ícono, igual que en la
                        lista: el nombre solo no dice cuál se eligió, y el ícono
                        es justamente lo que se va a ver en el sidebar. */}
                    <SelectValue>
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
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {MENU_ICONS.map((option) => {
                      const Icon = getNavIcon(option.value)
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <Icon />
                            <span className="truncate">{option.label}</span>
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <FieldError>{fieldErrors["icon"]}</FieldError>
              </Field>
              <Field variant="outlined">
                <FieldLabel htmlFor="menu-visible">Visible</FieldLabel>
                <Select
                  value={visible ? "si" : "no"}
                  onValueChange={(value) => value && setVisible(value === "si")}
                >
                  <SelectTrigger id="menu-visible">
                    <SelectValue>{(value) => (value === "no" ? "No" : "Si")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Si</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}

          {isEditing && (
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
            </div>
          )}

          {!isEditing && hasParentChoice && (
            <section className="rounded-lg border border-border p-4">
              <header className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold">Submenús</h3>
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
                  {/* Un título por columna, una sola vez arriba: los controles
                      van `outlined` y el label flotante de cada celda repetía
                      el mismo texto en cada fila. Cada control conserva su
                      `aria-label` para el lector de pantalla. */}
                  <div className="grid min-w-[34rem] grid-cols-[1fr_1fr_7rem_9rem_auto] gap-2 text-sm font-semibold">
                    <span>Nombre del menú*</span>
                    <span>URL*</span>
                    <span>Visible</span>
                    <span>Plan</span>
                    <span className="sr-only">Acciones</span>
                  </div>
                  <ul className="mt-2 flex flex-col gap-2">
                    {drafts.map((draft) => (
                      <li
                        key={draft.key}
                        className="grid min-w-[34rem] grid-cols-[1fr_1fr_7rem_9rem_auto] items-center gap-2"
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
                        <Select
                          value={draft.visible ? "si" : "no"}
                          onValueChange={(value) =>
                            value && updateDraft(draft.key, { visible: value === "si" })
                          }
                        >
                          <SelectTrigger variant="outlined" aria-label="Visible">
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
                        <ConfirmRemoveButton
                          label="Quitar submenú"
                          size="icon"
                          description={
                            draft.name.trim()
                              ? `Se quitará el submenú «${draft.name}». Esta acción no se puede deshacer.`
                              : "Se quitará el submenú. Esta acción no se puede deshacer."
                          }
                          onConfirm={() =>
                            setDrafts((prev) => prev.filter((it) => it.key !== draft.key))
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sin menú padre elegido no hay nada que guardar ni que cancelar más
            allá de la X del encabezado, así que el pie recién aparece con la
            primera respuesta. */}
        {hasParentChoice && (
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
        )}
      </DialogContent>
    </Dialog>
  )
}
