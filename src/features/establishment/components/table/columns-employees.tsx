import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PencilIcon } from "@/components/ui/icons"
import { DataTableColumnHeader } from "@/components/data-table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { EMPLOYEE_STATUS_BADGE, EMPLOYEE_STATUS_LABELS } from "../../api/employee-ui-mappings"
import type { EmployeeListItem } from "../../api/types/employee"
import { DeleteEmployeeDialog } from "../dialogs/dialog-delete-employee"

interface EmployeeColumnsOptions {
  onEdit: (employeeId: string) => void
}

function formatCampusNames(campuses: string[]) {
  return campuses.join(" · ")
}

export function createEmployeeColumns({ onEdit }: EmployeeColumnsOptions): ColumnDef<EmployeeListItem>[] {
  return [
  {
    accessorKey: "documentNumber",
    id: "documentNumber",
    header: ({ column }) => <DataTableColumnHeader column={column} title="N° Documento" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.documentNumber}</span>,
  },
  {
    accessorKey: "name",
    id: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => <div className="max-w-md truncate font-medium">{row.original.name}</div>,
  },
  {
    accessorKey: "role",
    id: "role",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Rol" />,
    cell: ({ row }) => (
      <Badge variant="soft" color="secondary">
        {row.original.role.name}
      </Badge>
    ),
  },
  {
    accessorKey: "campuses",
    id: "campuses",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sede educativa" />,
    enableSorting: false,
    cell: ({ row }) => {
      const campuses = row.original.campuses
      const fullText = formatCampusNames(campuses)

      return (
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="max-w-[18rem] truncate text-sm text-foreground">
                {fullText}
              </div>
            }
          />
          <TooltipContent>{fullText}</TooltipContent>
        </Tooltip>
      )
    },
  },
  {
    accessorKey: "workSchedule",
    id: "workSchedule",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
    cell: ({ row }) => (
      <Badge variant="outline" color="neutral">
        {row.original.workSchedule.name}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    id: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.original.status

      return <Badge {...EMPLOYEE_STATUS_BADGE[status]}>{EMPLOYEE_STATUS_LABELS[status]}</Badge>
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="fill"
          color="secondary"
          size="icon"
          className="size-8"
          aria-label="Editar funcionario"
          onClick={() => onEdit(row.original.id)}
        >
          <PencilIcon />
        </Button>
        <DeleteEmployeeDialog employee={row.original} />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 96,
  },
]
}