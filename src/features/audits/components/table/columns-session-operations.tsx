import type { ColumnDef, Table } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

import { OPERATION_TYPE_BADGE, OPERATION_TYPE_LABELS } from "../../api/ui-mappings"
import type { OperationType } from "../../api/types/audit-table"
import type { SessionOperation } from "../../api/types/audit"
import { ViewOperationChangesDialog } from "../dialogs/dialog-view-operation-changes"

export const columns: ColumnDef<SessionOperation>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        color="neutral"
        aria-label="Seleccionar página"
        className="translate-y-0.5"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={!table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        color="neutral"
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
    // Reemplaza Autor/IP de la tabla por-tabla-detalle: dentro de una
    // sesión todas las operaciones son del mismo autor, así que el dato
    // que sí aporta info es en qué TABLA se hicieron.
    id: "tableSlug",
    accessorKey: "tableSlug",
    header: () => <span className="text-xs font-medium">Tabla</span>,
    cell: ({ row }) => (
      <Badge variant="fill" color="muted">
        {row.original.tableSlug}
      </Badge>
    ),
  },
  {
    id: "operation",
    accessorKey: "operation",
    header: () => <span className="text-xs font-medium">Operación</span>,
    cell: ({ row }) => {
      const operation = row.getValue<OperationType>("operation")
      return <Badge {...OPERATION_TYPE_BADGE[operation]}>{OPERATION_TYPE_LABELS[operation]}</Badge>
    },
  },
  {
    id: "detail",
    accessorKey: "entityName",
    header: () => <span className="text-xs font-medium">Detalle</span>,
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
    header: () => <span className="text-xs font-medium">Fecha</span>,
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
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <ViewOperationChangesDialog
        tableSlug={row.original.tableSlug}
        operationId={row.original.id}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 48,
  },
]

export type SessionOperationsTable = Table<SessionOperation>
