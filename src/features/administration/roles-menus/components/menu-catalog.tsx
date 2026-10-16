import { Fragment, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsDownUpIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  GearIcon,
  InfoIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/ui/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
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

import { useReorderMenus } from "@/features/administration/roles-menus/api/mutations/reorder-menus"
import { useSetMenuActions } from "@/features/administration/roles-menus/api/mutations/set-menu-actions"
import { useSetMenuState } from "@/features/administration/roles-menus/api/mutations/set-menu-state"
import { useMenuCatalogQuery } from "@/features/administration/roles-menus/api/query/use-menu-catalog-query"
import {
  buildMenuTree,
  reorderSiblings,
} from "@/features/administration/roles-menus/api/types/role-menu"
import type {
  MenuCatalogNode,
  MenuTreeNode,
} from "@/features/administration/roles-menus/api/types/role-menu"
import { DialogDeleteMenu } from "@/features/administration/roles-menus/components/dialog-delete-menu"
import { DialogMenuActions } from "@/features/administration/roles-menus/components/dialog-menu-actions"
import { DialogMoveMenu } from "@/features/administration/roles-menus/components/dialog-move-menu"
import { DialogSaveMenu } from "@/features/administration/roles-menus/components/dialog-save-menu"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

/**
 * Módulos y submódulos (Administración del Sistema, Sección 4.1): el catálogo de
 * vistas en árbol, activas e inactivas. Lo que puede cada rol se define en la
 * otra pestaña.
 */
export function MenuCatalog() {
  const { notify } = useNotify()
  const { puedeCrear, puedeEditar, puedeEliminar } = useMenuPermission("CONFIG_ROLES_MENUS")
  const { data: menus = [], isPending } = useMenuCatalogQuery()
  // Los módulos arrancan plegados; aquí van los que el usuario desplegó.
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  // "new" = alta; un menú = edición; null = diálogo cerrado.
  const [editing, setEditing] = useState<MenuCatalogNode | MenuTreeNode | "new" | null>(null)
  const [moving, setMoving] = useState<{ menu: MenuCatalogNode; siblings: MenuCatalogNode[] } | null>(null)
  const [editingActions, setEditingActions] = useState<MenuCatalogNode | null>(null)
  const [deleting, setDeleting] = useState<{ menu: MenuCatalogNode; childrenCount: number } | null>(null)

  const tree = buildMenuTree(menus)
  const byId = new Map(menus.map((menu) => [menu.id, menu]))

  const onError = (error: Error) => notify(getErrorMessage(error), { variant: "error" })
  const reorderMenus = useReorderMenus({
    mutationConfig: { onSuccess: () => notify("Orden actualizado."), onError },
  })
  const setMenuState = useSetMenuState({
    mutationConfig: {
      onSuccess: (result, { activo }) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(activo ? "Menú activado." : "Menú inactivado.")
      },
      onError,
    },
  })

  const setMenuActions = useSetMenuActions({
    mutationConfig: {
      onSuccess: (result) => {
        setEditingActions(null)
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify("Acciones disponibles actualizadas.")
      },
      onError: (error) => {
        setEditingActions(null)
        onError(error)
      },
    },
  })

  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function move(node: MenuCatalogNode, siblings: MenuCatalogNode[], direction: -1 | 1) {
    moveTo(node, siblings, siblings.findIndex((it) => it.id === node.id) + direction)
  }

  /** Lleva `node` al índice `to` (desde 0) entre sus hermanos. */
  function moveTo(node: MenuCatalogNode, siblings: MenuCatalogNode[], to: number) {
    const ids = siblings.map((it) => it.id)
    const target = ids[to]
    if (target == null) return
    const items = reorderSiblings(siblings, ids, node.id, target)
    if (items.length > 0) reorderMenus.mutate(items)
  }

  if (isPending) return <Skeleton className="h-96" />

  const roots = tree.map((group) => byId.get(group.id)!)
  const busy = reorderMenus.isPending || setMenuState.isPending

  function renderRow(node: MenuCatalogNode, siblings: MenuCatalogNode[], children: MenuCatalogNode[]) {
    const isModule = node.idParent == null
    const open = expanded.has(node.id)
    const index = siblings.findIndex((it) => it.id === node.id)
    const Icon = getNavIcon(node.icon)
    const parent = node.idParent != null ? byId.get(node.idParent) : null

    return (
      <TableRow key={node.id}>
        <TableCell className={isModule ? "font-semibold" : "pl-12"}>
          <span className="inline-flex items-center gap-2">
            {isModule ? (
              <button
                type="button"
                aria-expanded={open}
                aria-label={`${open ? "Plegar" : "Desplegar"} ${node.name}`}
                className="grid size-5 place-items-center rounded-sm hover:bg-muted disabled:invisible"
                disabled={children.length === 0}
                onClick={() => toggleExpanded(node.id)}
              >
                {open ? <MinusIcon className="size-4" /> : <PlusIcon className="size-4" />}
              </button>
            ) : null}
            {node.name}
          </span>
        </TableCell>
        <TableCell>{parent?.name ?? "—"}</TableCell>
        <TableCell className="text-center">
          <Icon className="inline size-4" aria-label={node.icon ?? "Sin ícono"} />
        </TableCell>
        <TableCell className="text-right tabular-nums">{node.menuOrder ?? "—"}</TableCell>
        <TableCell>
          {/* Un módulo agrupa vistas: las acciones son de sus submódulos. */}
          {isModule ? null : node.admiteGuardar || node.admiteEliminar ? (
            <span className="flex flex-wrap gap-1.5">
              {node.admiteGuardar ? <Badge variant="outline" color="neutral">Guardar</Badge> : null}
              {node.admiteEliminar ? <Badge variant="outline" color="neutral">Eliminar</Badge> : null}
            </span>
          ) : (
            <span className="text-muted-foreground">Solo consulta</span>
          )}
        </TableCell>
        <TableCell>
          <Badge variant="soft" color={node.activo ? "success" : "muted"}>
            {node.activo ? "Activo" : "Inactivo"}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          {puedeEditar || (puedeEliminar && !node.enUso) ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  color="muted"
                  size="icon"
                  className="size-7"
                  aria-label={`Opciones de ${node.name}`}
                />
              }
            >
              <DotsThreeVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {puedeEditar ? (
              <>
              <DropdownMenuItem
                onClick={() => setEditing(isModule ? (tree.find((it) => it.id === node.id) ?? node) : node)}
              >
                <PencilIcon />
                Modificar
              </DropdownMenuItem>
              <DropdownMenuItem disabled={busy || index <= 0} onClick={() => move(node, siblings, -1)}>
                <ArrowUpIcon />
                Subir
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={busy || index === siblings.length - 1}
                onClick={() => move(node, siblings, 1)}
              >
                <ArrowDownIcon />
                Bajar
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={busy || siblings.length < 2}
                onClick={() => setMoving({ menu: node, siblings })}
              >
                <ArrowsDownUpIcon />
                Mover a posición…
              </DropdownMenuItem>
              {isModule ? null : (
                <DropdownMenuItem disabled={busy} onClick={() => setEditingActions(node)}>
                  <GearIcon />
                  Acciones disponibles…
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                disabled={busy}
                onClick={() => setMenuState.mutate({ id: node.id, activo: !node.activo })}
              >
                {node.activo ? <EyeSlashIcon /> : <EyeIcon />}
                {node.activo ? "Inactivar" : "Activar"}
              </DropdownMenuItem>
              </>
              ) : null}
              {node.enUso || !puedeEliminar ? null : (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleting({ menu: node, childrenCount: children.length })}
                >
                  <TrashIcon />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          ) : null}
        </TableCell>
      </TableRow>
    )
  }

  const views = menus.filter((menu) => menu.idParent != null).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Catálogo: {views} {views === 1 ? "vista" : "vistas"} en {roots.length}{" "}
          {roots.length === 1 ? "módulo" : "módulos"}.
          <HelpTip text="Incluye vistas activas e inactivas. Lo que puede hacer cada rol en ellas se define en Vistas base por rol." />
        </p>
        {puedeCrear ? (
          <Button type="button" onClick={() => setEditing("new")}>
            <PlusIcon data-icon="inline-start" />
            Nuevo módulo o submódulo
          </Button>
        ) : null}
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Nombre</TableHead>
            <TableHead>Módulo padre</TableHead>
            <TableHead className="w-20 text-center">Icono</TableHead>
            <TableHead className="w-24 text-right">
              <span className="inline-flex items-center gap-1.5">
                Orden
                <HelpTip text="Posición en el menú lateral, dentro de su módulo. Cámbiala con Subir y Bajar." />
              </span>
            </TableHead>
            <TableHead className="w-48">
              <span className="inline-flex items-center gap-1.5">
                Acciones disponibles
                <HelpTip text="Lo que se puede hacer en la vista. Es el tope para todos los roles: lo que no esté aquí no se puede dar en Vistas base por rol." />
              </span>
            </TableHead>
            <TableHead className="w-28">
              <span className="inline-flex items-center gap-1.5">
                Estado
                <HelpTip text="Una vista inactiva no aparece en el menú de ningún rol. Si el módulo está inactivo, tampoco sus submódulos." />
              </span>
            </TableHead>
            <TableHead className="w-14">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tree.map((group) => {
            const children = group.children.map((child) => byId.get(child.id)!)
            return (
              <Fragment key={group.id}>
                {renderRow(byId.get(group.id)!, roots, children)}
                {!expanded.has(group.id)
                  ? null
                  : children.map((child) => renderRow(child, children, []))}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>

      <DialogSaveMenu
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        roots={tree}
        menu={editing === "new" ? undefined : (editing ?? undefined)}
      />
      {moving ? (
        <DialogMoveMenu
          name={moving.menu.name}
          current={moving.siblings.findIndex((it) => it.id === moving.menu.id) + 1}
          total={moving.siblings.length}
          onMove={(position) => moveTo(moving.menu, moving.siblings, position - 1)}
          onOpenChange={(open) => !open && setMoving(null)}
        />
      ) : null}
      {editingActions ? (
        <DialogMenuActions
          name={editingActions.name}
          initial={{ guardar: editingActions.admiteGuardar, eliminar: editingActions.admiteEliminar }}
          busy={setMenuActions.isPending}
          onSave={(actions) => setMenuActions.mutate({ id: editingActions.id, ...actions })}
          onOpenChange={(open) => !open && setEditingActions(null)}
        />
      ) : null}
      {deleting ? (
        <DialogDeleteMenu
          menu={deleting.menu}
          childrenCount={deleting.childrenCount}
          open
          onOpenChange={(open) => !open && setDeleting(null)}
        />
      ) : null}
    </div>
  )
}

function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<button type="button" aria-label={text} className="grid place-items-center rounded-full" />}
      >
        <InfoIcon className="size-4" />
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{text}</TooltipContent>
    </Tooltip>
  )
}
