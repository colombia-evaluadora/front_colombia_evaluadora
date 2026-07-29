import type { ColumnDef, Table } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DeletePaymentDialog } from "../dialogs/dialog-delete-payment"
import { DataTableColumnHeader } from "@/components/data-table"
import { UpdatePaymentSheet } from "../sheets/sheet-update-payment"
import { PAYMENT_STATUS_BADGE, PAYMENT_STATUS_LABELS } from "../../api/ui-mappings"
import type { Payment, PaymentStatus } from "../../api/types/payment"
import { Badge } from "@/components/ui/badge"

export const columns: ColumnDef<Payment>[] = [
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
        aria-label={`Seleccionar ${row.original.email}`}
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
    accessorKey: "email",
    id: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
  },
  {
    accessorKey: "status",
    id: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.getValue<PaymentStatus>("status")
      return <Badge {...PAYMENT_STATUS_BADGE[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>
    },
  },
  {
    accessorKey: "amount",
    id: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Monto" className="justify-end" />
    ),
    cell: ({ row }) => {
      const amount = row.getValue<number>("amount")
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: "createdAt",
    id: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Creado" />,
    cell: ({ row }) => (
      <div>{new Date(row.getValue<string>("createdAt")).toLocaleDateString()}</div>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <UpdatePaymentSheet payment={row.original} />
        <DeletePaymentDialog payment={row.original} />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 96,
  },
]

export type PaymentsTable = Table<Payment>
