import { Fragment, useEffect, useState, type ReactNode } from "react"

import { useNotify } from "@/components/notice/notice-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, InfoIcon, MinusIcon, PlusIcon, WarningIcon } from "@/components/ui/icons"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage } from "@/lib/api-client"

import { useUpdateRoleMenus } from "@/features/administration/roles-menus/api/mutations/update-role-menus"
import type { MenuNode, MenuTreeNode } from "@/features/administration/roles-menus/api/types/role-menu"
import {
  ACTION_LABELS,
  diffViews,
  getPermission,
  toggleAction,
  toPayload,
} from "@/features/administration/roles-menus/api/types/role-views"
import type {
  PermissionChange,
  RoleViews,
  ViewAction,
} from "@/features/administration/roles-menus/api/types/role-views"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"

const ACTIONS: ViewAction[] = ["acceso", "guardar", "eliminar"]

interface RoleViewsEditorProps {
  roleId: number
  roleName: string
  tree: MenuTreeNode[]
  saved: RoleViews
  /** Selector de rol: va en la misma fila que Cancelar y Guardar. */
  roleSelect: ReactNode
  /** Avisa a la página para que no deje cambiar de rol con cambios sin guardar. */
  onDirtyChange: (dirty: boolean) => void
}

/**
 * Vistas base por rol (Administración del Sistema, Sección 4.2): árbol de
 * módulos y submódulos con Acceso, Guardar y Eliminar por vista. Los cambios
 * quedan en borrador hasta Guardar; si alguno quita permisos, se confirma antes.
 */
export function RoleViewsEditor({
  roleId,
  roleName,
  tree,
  saved,
  roleSelect,
  onDirtyChange,
}: RoleViewsEditorProps) {
  const { notify } = useNotify()
  const [draft, setDraft] = useState<RoleViews>(saved)
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Se arranca con los módulos que el rol ya tiene abiertos: es lo que se revisa.
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(tree.filter((group) => saved.has(group.id)).map((group) => group.id)),
  )

  // Al guardar se vuelve a pedir el rol: el borrador arranca de lo guardado.
  useEffect(() => setDraft(saved), [saved])

  const changes = diffViews(saved, draft)
  const removals = changes.filter((change) => !change.checked)
  const changed = new Set(changes.map((change) => `${change.id}-${change.action}`))

  useEffect(() => onDirtyChange(changes.length > 0), [changes.length, onDirtyChange])

  const updateRoleMenus = useUpdateRoleMenus({
    mutationConfig: {
      onSuccess: (result) => {
        setConfirmOpen(false)
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(`Vistas del rol ${roleName} guardadas.`)
      },
      onError: (error) => {
        setConfirmOpen(false)
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  function handleToggle(node: MenuNode | MenuTreeNode, action: ViewAction, checked: boolean) {
    setDraft((prev) => {
      // Guardar y Eliminar de un módulo se aplican a todos sus submódulos.
      if (action !== "acceso" && "children" in node) {
        return node.children.reduce(
          (acc, child) => toggleAction(acc, tree, child.id, action, checked),
          prev,
        )
      }
      return toggleAction(prev, tree, node.id, action, checked)
    })
  }

  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function save() {
    updateRoleMenus.mutate({ roleId, menus: toPayload(draft) })
  }

  const busy = updateRoleMenus.isPending
  const dirty = changes.length > 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-xs">{roleSelect}</div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            color="neutral"
            disabled={!dirty || busy}
            onClick={() => setDraft(saved)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!dirty || busy}
            onClick={() => (removals.length > 0 ? setConfirmOpen(true) : save())}
          >
            <FloppyDiskIcon data-icon="inline-start" />
            Guardar
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <span className="inline-flex items-center gap-1.5">
                Módulo / submódulo
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button type="button" aria-label="Cómo funcionan las vistas base" />
                    }
                  >
                    <InfoIcon className="size-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Es lo máximo que puede tener un funcionario con este rol. Quitar una vista o
                    acción la quita a todos los funcionarios con el rol, en todos los
                    establecimientos.
                  </TooltipContent>
                </Tooltip>
              </span>
            </TableHead>
            {ACTIONS.map((action) => (
              <TableHead key={action} className="w-40">
                {ACTION_LABELS[action]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tree.map((group) => {
            const open = expanded.has(group.id)
            return (
              <Fragment key={group.id}>
                <TableRow>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-label={`${open ? "Plegar" : "Desplegar"} ${group.name}`}
                        className="grid size-5 place-items-center rounded-sm hover:bg-muted"
                        onClick={() => toggleExpanded(group.id)}
                      >
                        {open ? <MinusIcon className="size-4" /> : <PlusIcon className="size-4" />}
                      </button>
                      <NodeIcon node={group} />
                      {group.name}
                    </span>
                  </TableCell>
                  {ACTIONS.map((action) => (
                    <ActionCell
                      key={action}
                      label={`${ACTION_LABELS[action]} en ${group.name}`}
                      checked={moduleChecked(draft, group, action)}
                      changed={changed.has(`${group.id}-${action}`)}
                      disabled={busy}
                      onChange={(checked) => handleToggle(group, action, checked)}
                    />
                  ))}
                </TableRow>
                {open
                  ? group.children.map((child) => (
                      <TableRow key={child.id}>
                        <TableCell className="pl-14">
                          <span className="inline-flex items-center gap-2">
                            <NodeIcon node={child} />
                            {child.name}
                          </span>
                        </TableCell>
                        {ACTIONS.map((action) => (
                          <ActionCell
                            key={action}
                            label={`${ACTION_LABELS[action]} en ${child.name}`}
                            checked={getPermission(draft, child.id)[action]}
                            changed={changed.has(`${child.id}-${action}`)}
                            disabled={busy}
                            onChange={(checked) => handleToggle(child, action, checked)}
                          />
                        ))}
                      </TableRow>
                    ))
                  : null}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>

      <ConfirmRemovalsDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        roleName={roleName}
        removals={removals}
        tree={tree}
        busy={busy}
        onConfirm={save}
      />
    </div>
  )
}


/**
 * Acceso del módulo es el suyo. Guardar y Eliminar del módulo resumen a sus
 * submódulos: encendidos si alguno los tiene.
 */
function moduleChecked(draft: RoleViews, group: MenuTreeNode, action: ViewAction): boolean {
  if (action === "acceso" || group.children.length === 0) {
    return getPermission(draft, group.id)[action]
  }
  return group.children.some((child) => getPermission(draft, child.id)[action])
}

function NodeIcon({ node }: { node: MenuNode }) {
  const Icon = getNavIcon(node.icon)
  return <Icon className="size-4 shrink-0 text-muted-foreground" />
}

interface ActionCellProps {
  label: string
  checked: boolean
  changed: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}

function ActionCell({ label, checked, changed, disabled, onChange }: ActionCellProps) {
  return (
    <TableCell>
      <span className="inline-flex items-center gap-2">
        <Switch
          aria-label={label}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
        />
        {changed ? (
          <Badge variant="soft" color="warning">
            Sin guardar
          </Badge>
        ) : null}
      </span>
    </TableCell>
  )
}


interface ConfirmRemovalsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleName: string
  removals: PermissionChange[]
  tree: MenuTreeNode[]
  busy: boolean
  onConfirm: () => void
}

/** Confirmación al quitar permisos (Regla 16): qué se quita, dónde y a quién. */
function ConfirmRemovalsDialog({
  open,
  onOpenChange,
  roleName,
  removals,
  tree,
  busy,
  onConfirm,
}: ConfirmRemovalsDialogProps) {
  const single = removals.length === 1 ? removals[0] : null

  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <WarningIcon className="size-5 text-orange" />
            Quitar permisos al rol {roleName}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-foreground">
            {single ? (
              <>
                Se quitará <strong>{ACTION_LABELS[single.action]}</strong> en{" "}
                <strong>{viewPath(tree, single.id)}</strong> a los funcionarios con el rol{" "}
                {roleName}, en todos los establecimientos.
              </>
            ) : (
              <>
                Se quitará a los funcionarios con el rol {roleName}, en todos los
                establecimientos:
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {single ? null : (
          <ul className="max-h-60 list-disc overflow-y-auto pl-5 text-sm">
            {removals.map((change) => (
              <li key={`${change.id}-${change.action}`}>
                <strong>{ACTION_LABELS[change.action]}</strong> en{" "}
                <strong>{viewPath(tree, change.id)}</strong>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">
          Los permisos que cada establecimiento haya restringido se mantienen.
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline" color="neutral" disabled={busy}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction color="destructive" disabled={busy} onClick={onConfirm}>
            Confirmar cambio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** "Módulo › Vista", o solo el módulo. */
function viewPath(tree: MenuTreeNode[], id: number): string {
  for (const group of tree) {
    if (group.id === id) return group.name
    const child = group.children.find((it) => it.id === id)
    if (child) return `${group.name} › ${child.name}`
  }
  return String(id)
}
