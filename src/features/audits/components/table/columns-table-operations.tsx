import type { ColumnDef, Table } from "@tanstack/react-table"
import { CheckIcon } from "@phosphor-icons/react"

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import {
  OPERATION_TYPE_BADGE,
  OPERATION_TYPE_LABELS,
} from "../../api/ui-mappings"
import type { OperationType, TableOperation } from "../../api/types/audit-table"

function initials(name: string): string {
  const [first, second] = name.trim().split(/\s+/)
  return `${first?.[0] ?? ""}${second?.[0] ?? ""}`.toUpperCase()
}

export const columns: ColumnDef<TableOperation>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        aria-label="Seleccionar página"
        className="translate-y-0.5"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={
          !table.getIsAllPageRowsSelected() &&
          table.getIsSomePageRowsSelected()
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Seleccionar ${row.original.entityName}`}
        className="translate-y-0.5"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 32,
  },
  {
    id: "operation",
    accessorKey: "operation",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Operación" />
    ),
    cell: ({ row }) => {
      const operation = row.getValue<OperationType>("operation")
      return (
        <Badge {...OPERATION_TYPE_BADGE[operation]}>
          {OPERATION_TYPE_LABELS[operation]}
        </Badge>
      )
    },
  },
  {
    id: "authorIp",
    accessorKey: "authorName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Autor / IP" />
    ),
    cell: ({ row }) => {
      const op = row.original
      return (
        <div className="flex items-center gap-3">
          <Avatar>
            {op.authorAvatarUrl && <AvatarImage src={op.authorAvatarUrl} alt="" />}
            <AvatarFallback>{initials(op.authorName)}</AvatarFallback>
            {op.authorVerified && (
              <AvatarBadge>
                <CheckIcon weight="bold" />
              </AvatarBadge>
            )}
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-semibold">{op.authorName}</span>
            <Badge variant="fill" color="muted">
              {op.ip}
            </Badge>
          </div>
        </div>
      )
    },
  },
  {
    id: "detail",
    accessorKey: "entityName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Detalle" />
    ),
    cell: ({ row }) => {
      const op = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium">{op.entityName}</span>
          <span className="text-xs text-muted-foreground">{op.entityId}</span>
        </div>
      )
    },
  },
  {
    id: "occurredAt",
    accessorKey: "occurredAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha" />
    ),
    cell: ({ row }) => {
      const occurredAt = new Date(row.getValue<string>("occurredAt"))
      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {occurredAt.toLocaleTimeString(undefined, { hour12: false })}
          </span>
          <span className="text-xs text-muted-foreground">
            {occurredAt.toLocaleDateString("en-CA")}
          </span>
        </div>
      )
    },
  },
]

export type TableOperationsTable = Table<TableOperation>
