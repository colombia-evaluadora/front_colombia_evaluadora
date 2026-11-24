import { Fragment, useEffect, useState, type ReactNode } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import {
  FloppyDiskIcon,
  InfoIcon,
  LockIcon,
  MinusIcon,
  PlusIcon,
  WarningIcon,
  XIcon,
} from "@/components/ui/icons"
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
import { useMenuCatalogQuery } from "@/features/administration/roles-menus/api/query/use-menu-catalog-query"
import { useRoleEmployeesCountQuery } from "@/features/administration/roles-menus/api/query/use-role-employees-count-query"
import type { ViewLocks } from "@/features/administration/roles-menus/api/query/use-role-menus-query"
import {
  childrenMap,
  parentMap,
  withRequiredParents,
} from "@/features/administration/roles-menus/api/types/role-menu"
import type {
  MenuChildNode,
  MenuNode,
  MenuTreeNode,
} from "@/features/administration/roles-menus/api/types/role-menu"
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
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

const ACTIONS: ViewAction[] = ["acceso", "guardar", "eliminar"]

interface RoleViewsEditorProps {
  roleId: number
  roleName: string
  tree: MenuTreeNode[]
  saved: RoleViews
  /** Acciones bloqueadas para el rol en cada vista (roles territoriales, S.3.VRO.3/4). */
  locks: Map<number, ViewLocks>
  /** Selector de rol: va en la misma fila que Cancelar y Guardar. */
  roleSelect: ReactNode
  /** Avisa a la página para que no deje cambiar de rol con cambios sin guardar. */
  onDirtyChange: (dirty: boolean) => void
}

/** Vistas base por rol (Sección 4.2): borrador hasta Guardar; quitar permisos pide confirmación. */
export function RoleViewsEditor({
  roleId,
  roleName,
  tree,
  saved,
  locks,
  roleSelect,
  onDirtyChange,
}: RoleViewsEditorProps) {
  const { notify } = useNotify()
  const { data: catalog = [] } = useMenuCatalogQuery()
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

  // Acciones que tiene cada vista (Módulos y submódulos). Mientras carga, todas.
  const admitted = new Map(catalog.map((menu) => [menu.id, menu]))
  function admits(id: number, action: ViewAction): boolean {
    const menu = admitted.get(id)
    if (!menu || action === "acceso") return true
    return action === "guardar" ? menu.admiteGuardar : menu.admiteEliminar
  }
  const locked = (id: number, action: ViewAction) =>
    action !== "acceso" && Boolean(locks.get(id)?.[action])

  const parentOf = parentMap(tree)
  const childrenOf = childrenMap(tree)
  // Módulo fuera de la licencia (S.3.VRO.1c): toda su rama queda apagada y sin interruptores activos.
  const fueraDeLicencia = new Set(tree.filter((group) => group.fueraDeLicencia).map((group) => group.id))
  function enLicencia(id: number): boolean {
    for (let p: number | null | undefined = id; p != null; p = parentOf.get(p)) {
      if (fueraDeLicencia.has(p)) return false
    }
    return true
  }
  const tienePestanas = tree.some((group) =>
    group.children.some((child) => (child.pestanas ?? []).length > 0),
  )

  function handleToggle(node: MenuNode, action: ViewAction, checked: boolean) {
    setDraft((prev) => {
      // Guardar y Eliminar de un módulo se aplican a los submódulos que los tienen y no están bloqueados.
      const hijos = childrenOf.get(node.id) ?? []
      if (action !== "acceso" && node.idParent == null && hijos.length > 0) {
        return hijos
          .filter((childId) => admits(childId, action) && !locked(childId, action))
          .reduce((acc, childId) => toggleAction(acc, tree, childId, action, checked), prev)
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
    // El backend rechaza un submódulo sin su módulo: el padre que falte viaja con solo Acceso.
    const views = new Map(draft)
    for (const id of withRequiredParents([...draft.keys()], tree)) {
      if (!views.has(id)) views.set(id, { acceso: true, guardar: false, eliminar: false })
    }
    updateRoleMenus.mutate({ roleId, menus: toPayload(views) })
  }

  const { puedeEditar } = useMenuPermission("CONFIG_ROLES_MENUS")
  // Sin Guardar los interruptores quedan bloqueados (`busy`) y no hay botones.
  const busy = updateRoleMenus.isPending || !puedeEditar
  const dirty = changes.length > 0

  function cells(node: MenuNode, enRama: boolean) {
    return ACTIONS.map((action) => (
      <ActionCell
        key={action}
        label={`${ACTION_LABELS[action]} en ${node.name}`}
        available={admits(node.id, action)}
        checked={enRama && getPermission(draft, node.id)[action]}
        changed={changed.has(`${node.id}-${action}`)}
        disabled={busy || !enRama}
        locked={locked(node.id, action) ? roleName : undefined}
        onChange={(checked) => handleToggle(node, action, checked)}
      />
    ))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-xs">{roleSelect}</div>
        <div className={puedeEditar ? "flex items-center gap-2" : "hidden"}>
          <Button
            type="button"
            variant="outline"
            color="neutral"
            disabled={!dirty || busy}
            onClick={() => setDraft(saved)}
          >
            <XIcon data-icon="inline-start" />
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

      <Table containerClassName="max-h-[calc(100dvh-24rem)] min-h-64 overflow-y-auto">
        <TableHeader className="sticky top-0 z-20 bg-background">
          <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
            <TableHead className="text-foreground">
              <span className="inline-flex items-center gap-1.5">
                {tienePestanas ? "Módulo / submódulo / pestaña" : "Módulo / submódulo"}
                <Tooltip>
                  <TooltipTrigger
                    render={<button type="button" aria-label="Cómo funcionan las vistas base" />}
                  >
                    <InfoIcon className="size-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Es lo máximo que puede tener un funcionario con este rol. Cada establecimiento
                    puede restringirlo, pero no ampliarlo.
                  </TooltipContent>
                </Tooltip>
              </span>
            </TableHead>
            {ACTIONS.map((action) => (
              <TableHead key={action} className="w-40 text-center text-foreground">
                {ACTION_LABELS[action]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tree.map((group) => {
            const open = expanded.has(group.id)
            const enRama = enLicencia(group.id)
            return (
              <Fragment key={group.id}>
                <TableRow className={enRama ? undefined : "opacity-55"}>
                  <TableCell>
                    <span className="inline-flex flex-wrap items-center gap-2 font-semibold">
                      <ExpandButton
                        open={open}
                        name={group.name}
                        disabled={group.children.length === 0}
                        onClick={() => toggleExpanded(group.id)}
                      />
                      <NodeIcon node={group} />
                      {group.name}
                      {enRama ? null : (
                        <Badge variant="soft" color="neutral">
                          No incluido en la licencia
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  {ACTIONS.map((action) => (
                    <ActionCell
                      key={action}
                      label={`${ACTION_LABELS[action]} en ${group.name}`}
                      available={
                        action === "acceso" ||
                        group.children.length === 0 ||
                        group.children.some((child) => admits(child.id, action))
                      }
                      checked={enRama && moduleChecked(draft, group, action, admits)}
                      changed={changed.has(`${group.id}-${action}`)}
                      disabled={busy || !enRama}
                      onChange={(checked) => handleToggle(group, action, checked)}
                    />
                  ))}
                </TableRow>
                {open
                  ? group.children.map((child) => (
                      <ChildRows
                        key={child.id}
                        child={child}
                        open={expanded.has(child.id)}
                        muted={!enRama}
                        onToggleOpen={() => toggleExpanded(child.id)}
                        renderCells={(node) => cells(node, enRama)}
                      />
                    ))
                  : null}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>

      {/* Aviso fijo al pie (S.3.VRO.1): el alcance de quitar permisos. */}
      <Alert variant="info">
        <InfoIcon />
        <AlertDescription>
          {tienePestanas
            ? "Quitar una vista, una pestaña o una acción al rol la quita a todos los funcionarios con ese rol, en todos los establecimientos."
            : "Quitar una vista o acción al rol la quita a todos los funcionarios con ese rol, en todos los establecimientos."}
        </AlertDescription>
      </Alert>

      <ConfirmRemovalsDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        roleId={roleId}
        roleName={roleName}
        removals={removals}
        tree={tree}
        busy={busy}
        onConfirm={save}
      />
    </div>
  )
}

/** Guardar y Eliminar del módulo resumen a sus submódulos: encendidos si alguno los tiene. */
function moduleChecked(
  draft: RoleViews,
  group: MenuTreeNode,
  action: ViewAction,
  admits: (id: number, action: ViewAction) => boolean,
): boolean {
  if (action === "acceso" || group.children.length === 0) {
    return getPermission(draft, group.id)[action]
  }
  return group.children.some(
    (child) => admits(child.id, action) && getPermission(draft, child.id)[action],
  )
}

function NodeIcon({ node }: { node: MenuNode }) {
  // Ícono cargado como archivo (S.3.CAT.3): se pinta la imagen; si no, el del catálogo de íconos.
  if (node.icon?.startsWith("data:") || node.icon?.startsWith("http")) {
    return <img src={node.icon} alt="" className="size-4 shrink-0" />
  }
  const Icon = getNavIcon(node.icon)
  return <Icon className="size-4 shrink-0 text-muted-foreground" />
}

function ExpandButton({
  open,
  name,
  disabled,
  onClick,
}: {
  open: boolean
  name: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={`${open ? "Plegar" : "Desplegar"} ${name}`}
      disabled={disabled}
      className="grid size-5 place-items-center rounded-sm hover:bg-muted disabled:invisible"
      onClick={onClick}
    >
      {open ? <MinusIcon className="size-4" /> : <PlusIcon className="size-4" />}
    </button>
  )
}

/** Fila de un submódulo y, si está desplegado, las de sus pestañas con permiso propio (S.3.VRO.1a). */
function ChildRows({
  child,
  open,
  muted,
  onToggleOpen,
  renderCells,
}: {
  child: MenuChildNode
  open: boolean
  muted: boolean
  onToggleOpen: () => void
  renderCells: (node: MenuNode) => ReactNode
}) {
  const pestanas = child.pestanas ?? []
  const conPestanas = pestanas.length > 0
  return (
    <>
      <TableRow className={muted ? "opacity-55" : undefined}>
        <TableCell className={conPestanas ? "pl-7" : "pl-14"}>
          <span className={conPestanas ? "inline-flex items-center gap-2 font-medium" : "inline-flex items-center gap-2"}>
            {conPestanas ? <ExpandButton open={open} name={child.name} onClick={onToggleOpen} /> : null}
            {child.name}
          </span>
        </TableCell>
        {renderCells(child)}
      </TableRow>
      {open
        ? pestanas.map((tab) => (
            <TableRow key={tab.id} className={muted ? "opacity-55" : undefined}>
              <TableCell className="pl-20">
                <span className="inline-flex items-center gap-2">
                  {tab.name}
                  <Badge variant="outline" color="neutral">
                    Pestaña
                  </Badge>
                </span>
              </TableCell>
              {renderCells(tab)}
            </TableRow>
          ))
        : null}
    </>
  )
}

interface ActionCellProps {
  label: string
  /** La vista tiene la acción (Módulos y submódulos); si no, no hay interruptor. */
  available: boolean
  checked: boolean
  changed: boolean
  disabled: boolean
  /** Nombre del rol si la acción está bloqueada para él: interruptor apagado y candado. */
  locked?: string
  onChange: (checked: boolean) => void
}

function ActionCell({ label, available, checked, changed, disabled, locked, onChange }: ActionCellProps) {
  if (!available) {
    return (
      <TableCell className="text-center">
        <Tooltip>
          <TooltipTrigger
            render={<span className="text-muted-foreground" aria-label={`${label}: la vista no la tiene`} />}
          >
            —
          </TooltipTrigger>
          <TooltipContent>La vista no tiene esta acción. Se habilita en Módulos y submódulos.</TooltipContent>
        </Tooltip>
      </TableCell>
    )
  }
  if (locked) {
    return (
      <TableCell className="text-center">
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                tabIndex={0}
                className="relative inline-flex rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            }
          >
            <Switch round aria-label={`${label}: bloqueada`} checked={false} disabled />
            {/* Fuera del flujo: el interruptor queda centrado igual que los demás. */}
            <LockIcon className="absolute top-1/2 left-full ml-2 size-4 -translate-y-1/2 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-64">
            Bloqueada para el rol {locked}: no se puede activar desde esta pantalla.
          </TooltipContent>
        </Tooltip>
      </TableCell>
    )
  }
  return (
    <TableCell className="text-center">
      <span className="relative inline-flex">
        <Switch round aria-label={label} checked={checked} disabled={disabled} onCheckedChange={onChange} />
        {changed ? (
          <Badge variant="soft" color="warning" className="absolute top-1/2 left-full ml-2 -translate-y-1/2 whitespace-nowrap">
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
  roleId: number
  roleName: string
  removals: PermissionChange[]
  tree: MenuTreeNode[]
  busy: boolean
  onConfirm: () => void
}

/** Confirmación al quitar permisos (S.3.VRO.2): qué se quita, dónde y a quién. */
function ConfirmRemovalsDialog({
  open,
  onOpenChange,
  roleId,
  roleName,
  removals,
  tree,
  busy,
  onConfirm,
}: ConfirmRemovalsDialogProps) {
  const single = removals.length === 1 ? removals[0] : null
  // Se pide al abrir: el total cambia cuando se asignan roles en los establecimientos.
  const { data: total } = useRoleEmployeesCountQuery(roleId, open)
  const funcionarios =
    total == null ? "a los funcionarios" : total === 1 ? "al funcionario" : `a los ${total} funcionarios`

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
                <strong>{viewPath(tree, single.id)}</strong>{" "}
                {total == null ? funcionarios : <strong>{funcionarios}</strong>} con el rol {roleName}, en
                todos los establecimientos.
              </>
            ) : (
              <>
                Se quitará {total == null ? funcionarios : <strong>{funcionarios}</strong>} con el rol{" "}
                {roleName}, en todos los establecimientos:
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
            <XIcon data-icon="inline-start" />
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction color="primary" disabled={busy} onClick={onConfirm}>
            Confirmar cambio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function viewPath(tree: MenuTreeNode[], id: number): string {
  for (const group of tree) {
    if (group.id === id) return group.name
    for (const child of group.children) {
      if (child.id === id) return `${group.name} › ${child.name}`
      const tab = child.pestanas?.find((it) => it.id === id)
      if (tab) return `${group.name} › ${child.name} › ${tab.name}`
    }
  }
  return String(id)
}
