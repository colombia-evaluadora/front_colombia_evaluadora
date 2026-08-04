import { useMemo, useState, type ReactNode } from "react"

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CaretDownIcon,
  CaretUpIcon,
  FolderOpenIcon,
  MagnifyingGlassIcon,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"
import { cn } from "@/lib/utils"

import type { MenuNode, MenuTreeNode } from "../api/types/role-menu"

function SearchMenus({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative">
      <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type="search"
        autoComplete="off"
        placeholder="Buscar menú..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 pl-8"
      />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
      <FolderOpenIcon className="size-8" />
      <span className="text-sm">{message}</span>
    </div>
  )
}

function matches(node: MenuNode, query: string) {
  const q = query.trim().toLowerCase()
  return !q || node.name.toLowerCase().includes(q)
}

/** Grupo + sus hijos, ya filtrados por el buscador de cada panel. */
interface VisibleGroup {
  group: MenuTreeNode
  children: MenuNode[]
}

function filterTree(tree: MenuTreeNode[], query: string): VisibleGroup[] {
  return tree
    .map((group) => ({
      group,
      // Si el grupo coincide se muestran todos sus hijos; si no, solo los que
      // coinciden por su cuenta.
      children: matches(group, query)
        ? group.children
        : group.children.filter((child) => matches(child, query)),
    }))
    .filter(({ group, children }) => matches(group, query) || children.length > 0)
}

function MenuRow({
  node,
  depth,
  muted,
  action,
  extra,
}: {
  node: MenuNode
  depth: 0 | 1
  muted?: boolean
  action?: ReactNode
  extra?: ReactNode
}) {
  const Icon = depth === 0 ? getNavIcon(node.icon) : null

  return (
    <li
      className={cn(
        "flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0",
        depth === 1 && "pl-9",
        muted && "text-muted-foreground",
      )}
    >
      {Icon ? (
        <Icon className="size-4 shrink-0" />
      ) : (
        <span aria-hidden="true" className="shrink-0 text-muted-foreground">
          •
        </span>
      )}
      <span className={cn("min-w-0 flex-1 truncate text-sm", depth === 0 && "font-medium")}>
        {node.name}
      </span>
      {extra}
      {action}
    </li>
  )
}

function MoveButton({
  direction,
  label,
  onClick,
}: {
  direction: "assign" | "unassign"
  label: string
  onClick: () => void
}) {
  const Icon = direction === "assign" ? ArrowRightIcon : ArrowLeftIcon
  return (
    <Button type="button" variant="ghost" size="icon" className="size-7" onClick={onClick}>
      <span className="sr-only">{label}</span>
      <Icon />
    </Button>
  )
}

interface MenuTransferProps {
  tree: MenuTreeNode[]
  assignedIds: number[]
  onAssign: (ids: number[]) => void
  onUnassign: (ids: number[]) => void
  disabled?: boolean
}

/**
 * Dos paneles: a la izquierda el catálogo completo de menús y a la derecha los
 * que tiene el rol. Los menús ya asignados siguen listados a la izquierda pero
 * apagados y sin flecha, para que la estructura del menú se lea igual de los
 * dos lados.
 *
 * Reglas de la jerarquía, para que el menú resultante nunca quede colgado:
 *  - asignar un ítem asigna también su grupo;
 *  - quitar un grupo quita sus ítems.
 */
export function MenuTransfer({
  tree,
  assignedIds,
  onAssign,
  onUnassign,
  disabled,
}: MenuTransferProps) {
  const [availableSearch, setAvailableSearch] = useState("")
  const [assignedSearch, setAssignedSearch] = useState("")
  const [collapsed, setCollapsed] = useState<number[]>([])

  const assigned = useMemo(() => new Set(assignedIds), [assignedIds])

  const availableGroups = filterTree(tree, availableSearch)
  const assignedGroups = filterTree(tree, assignedSearch)
    .map(({ group, children }) => ({
      group,
      children: children.filter((child) => assigned.has(child.id)),
    }))
    .filter(({ group, children }) => assigned.has(group.id) || children.length > 0)

  function toggleCollapsed(id: number) {
    setCollapsed((prev) => (prev.includes(id) ? prev.filter((it) => it !== id) : [...prev, id]))
  }

  function assignGroup(group: MenuTreeNode) {
    onAssign([group.id, ...group.children.map((child) => child.id)])
  }

  function unassignGroup(group: MenuTreeNode) {
    onUnassign([group.id, ...group.children.map((child) => child.id)])
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="flex flex-col rounded-lg border border-border">
        <header className="flex items-center justify-between gap-2 px-3 py-3">
          <h3 className="text-sm font-semibold">Menús disponibles</h3>
          <Button
            type="button"
            size="sm"
            disabled={disabled || availableGroups.length === 0}
            onClick={() => availableGroups.forEach(({ group }) => assignGroup(group))}
          >
            Asignar todo
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </header>
        <div className="px-3 pb-3">
          <SearchMenus
            id="available-menus-search"
            value={availableSearch}
            onChange={setAvailableSearch}
          />
        </div>
        {availableGroups.length === 0 ? (
          <EmptyState message="Sin menús que coincidan." />
        ) : (
          <ul className="border-t border-border">
            {availableGroups.map(({ group, children }) => {
              const isCollapsed = collapsed.includes(group.id)
              const isAssigned = assigned.has(group.id)
              return (
                <li key={group.id}>
                  <ul>
                    <MenuRow
                      node={group}
                      depth={0}
                      muted={isAssigned}
                      extra={
                        children.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => toggleCollapsed(group.id)}
                          >
                            <span className="sr-only">
                              {isCollapsed ? "Mostrar" : "Ocultar"} los menús de {group.name}
                            </span>
                            {isCollapsed ? <CaretDownIcon /> : <CaretUpIcon />}
                          </Button>
                        )
                      }
                      action={
                        !isAssigned && !disabled ? (
                          <MoveButton
                            direction="assign"
                            label={`Asignar ${group.name}`}
                            onClick={() => assignGroup(group)}
                          />
                        ) : (
                          <span className="size-7" aria-hidden="true" />
                        )
                      }
                    />
                    {!isCollapsed &&
                      children.map((child) => {
                        const childAssigned = assigned.has(child.id)
                        return (
                          <MenuRow
                            key={child.id}
                            node={child}
                            depth={1}
                            muted={childAssigned}
                            action={
                              !childAssigned && !disabled ? (
                                <MoveButton
                                  direction="assign"
                                  label={`Asignar ${child.name}`}
                                  // El grupo va junto con el ítem: un ítem sin
                                  // su grupo no se podría pintar en el menú.
                                  onClick={() => onAssign([group.id, child.id])}
                                />
                              ) : (
                                <span className="size-7" aria-hidden="true" />
                              )
                            }
                          />
                        )
                      })}
                  </ul>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col rounded-lg border border-border">
        <header className="flex items-center justify-between gap-2 px-3 py-3">
          <h3 className="text-sm font-semibold">Menús asignados</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || assignedGroups.length === 0}
            onClick={() => assignedGroups.forEach(({ group }) => unassignGroup(group))}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Quitar todo
          </Button>
        </header>
        <div className="px-3 pb-3">
          <SearchMenus
            id="assigned-menus-search"
            value={assignedSearch}
            onChange={setAssignedSearch}
          />
        </div>
        {assignedGroups.length === 0 ? (
          <EmptyState message="El rol todavía no tiene menús asignados." />
        ) : (
          <ul className="border-t border-border">
            {assignedGroups.map(({ group, children }) => (
              <li key={group.id}>
                <ul>
                  <MenuRow
                    node={group}
                    depth={0}
                    action={
                      disabled ? undefined : (
                        <MoveButton
                          direction="unassign"
                          // Quitar el grupo se lleva sus ítems: si no, quedarían
                          // sin dónde colgarse.
                          label={`Quitar ${group.name}`}
                          onClick={() => unassignGroup(group)}
                        />
                      )
                    }
                  />
                  {children.map((child) => (
                    <MenuRow
                      key={child.id}
                      node={child}
                      depth={1}
                      action={
                        disabled ? undefined : (
                          <MoveButton
                            direction="unassign"
                            label={`Quitar ${child.name}`}
                            onClick={() => onUnassign([child.id])}
                          />
                        )
                      }
                    />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
