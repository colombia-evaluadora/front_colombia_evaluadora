import { useState, type ReactNode } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DotsSixVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  InfoIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/ui/icons"
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
import { useArrastrarFilas } from "@/hooks/use-arrastrar-filas"
import { getErrorMessage } from "@/lib/api-client"

import { useReorderMenus } from "@/features/administration/roles-menus/api/mutations/reorder-menus"
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
  const [deleting, setDeleting] = useState<{ menu: MenuCatalogNode; childrenCount: number } | null>(null)

  const tree = buildMenuTree(menus)
  const byId = new Map(menus.map((menu) => [menu.id, menu]))
  const roots = tree.map((group) => byId.get(group.id)!)

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

  // Se arrastra entre hermanos: los módulos son un tbody cada uno, los submódulos filas del suyo.
  const arrastreModulo = useArrastrarFilas(
    (desde, hasta) => moveTo(roots[desde], roots, hasta),
    {
      unidad: (asa) => asa.closest("tbody"),
      hermanas: (tbody) =>
        Array.from(tbody.parentElement?.querySelectorAll(":scope > tbody") ?? []) as HTMLElement[],
    },
  )
  const arrastreSubmodulo = useArrastrarFilas(
    (desde, hasta, fila) => {
      const group = tree.find((it) => it.id === Number(fila.dataset.padre))
      const siblings = (group?.children ?? []).map((child) => byId.get(child.id)!)
      moveTo(siblings[desde], siblings, hasta)
    },
    {
      hermanas: (fila) =>
        Array.from(fila.parentElement?.querySelectorAll(":scope > tr[data-padre]") ?? []) as HTMLElement[],
    },
  )

  if (isPending) return <Skeleton className="h-96" />

  const busy = reorderMenus.isPending || setMenuState.isPending

  function renderRow(node: MenuCatalogNode, siblings: MenuCatalogNode[], children: MenuCatalogNode[]) {
    const isModule = node.idParent == null
    const open = expanded.has(node.id)
    const deleteBlock = deleteBlockReason(node, children)
    const index = siblings.findIndex((it) => it.id === node.id)
    const Icon = getNavIcon(node.icon)
    const parent = node.idParent != null ? byId.get(node.idParent) : null

    return (
      <TableRow key={node.id} className="group/row" data-padre={node.idParent ?? undefined}>
        <TableCell className={isModule ? "font-semibold" : "pl-12"}>
          <span className="inline-flex items-center gap-2">
            {puedeEditar && siblings.length > 1 ? (
              <button
                type="button"
                aria-label={`Mover ${node.name}, posición ${index + 1}. Usa las flechas arriba y abajo`}
                disabled={busy}
                {...(isModule ? arrastreModulo : arrastreSubmodulo)}
                onKeyDown={(e) => {
                  const delta = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0
                  if (!delta) return
                  e.preventDefault()
                  move(node, siblings, delta)
                }}
                className="cursor-grab touch-none rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 active:cursor-grabbing disabled:cursor-default disabled:opacity-50"
              >
                <DotsSixVerticalIcon className="size-5" />
              </button>
            ) : null}
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
          {/* El sidebar solo pinta el ícono del módulo. */}
          {isModule ? <Icon className="inline size-4" aria-label={node.icon ?? "Sin ícono"} /> : "—"}
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
        <TableCell>
          {/* Aparecen al pasar el mouse o con el foco; en pantallas táctiles, siempre. */}
          <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 pointer-coarse:opacity-100">
            {puedeEditar ? (
              <>
                <RowAction
                  label="Modificar"
                  onClick={() => setEditing(isModule ? (tree.find((it) => it.id === node.id) ?? node) : node)}
                >
                  <PencilIcon />
                </RowAction>
                <RowAction
                  label={node.activo ? "Inactivar" : "Activar"}
                  disabled={busy}
                  onClick={() => setMenuState.mutate({ id: node.id, activo: !node.activo })}
                >
                  {node.activo ? <EyeSlashIcon /> : <EyeIcon />}
                </RowAction>
              </>
            ) : null}
            {puedeEliminar ? (
              <RowAction
                label={deleteBlock ?? "Eliminar"}
                disabled={deleteBlock != null}
                destructive
                onClick={() => setDeleting({ menu: node, childrenCount: children.length })}
              >
                <TrashIcon />
              </RowAction>
            ) : null}
          </div>
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

      {/* Lo que se arrastra flota sobre lo demás. */}
      <Table containerClassName="max-h-[calc(100dvh-20rem)] min-h-64 overflow-y-auto [&_[data-arrastrando]]:relative [&_[data-arrastrando]]:z-10 [&_[data-arrastrando]]:bg-card [&_[data-arrastrando]]:shadow-lg [&_[data-arrastrando]]:select-none">
        <TableHeader className="sticky top-0 z-10 bg-background">
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
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        {tree.map((group) => {
          const children = group.children.map((child) => byId.get(child.id)!)
          return (
            // Un tbody por módulo: la última fila de cada uno conserva su línea, salvo la del final.
            <TableBody
              key={group.id}
              className="[&_tr:last-child]:border-b last:[&_tr:last-child]:border-0"
            >
              {renderRow(byId.get(group.id)!, roots, children)}
              {!expanded.has(group.id) ? null : children.map((child) => renderRow(child, children, []))}
            </TableBody>
          )
        })}
      </Table>

      <DialogSaveMenu
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        roots={tree}
        menu={editing === "new" ? undefined : (editing ?? undefined)}
      />
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

/** Botón de ícono con tooltip, como en las demás tablas; deshabilitado conserva el tooltip. */
function RowAction({
  label,
  disabled,
  destructive,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  destructive?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        <Button
          type="button"
          variant="ghost"
          color={destructive ? "destructive" : "neutral"}
          size="icon-sm"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{label}</TooltipContent>
    </Tooltip>
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

/** Por qué el SSO rechazaría la baja (V115): ningún menú de la rama puede estar asignado. */
function deleteBlockReason(node: MenuCatalogNode, children: MenuCatalogNode[]): string | null {
  const rama = [node, ...children]
  const what = children.length > 0 ? "El módulo o alguno de sus submódulos" : "El menú"
  if (rama.some((menu) => menu.enUso)) {
    return `${what} está asignado a un rol. Quítalo en Vistas por rol para eliminarlo.`
  }
  return null
}
