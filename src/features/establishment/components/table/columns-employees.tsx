import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { PencilIcon } from "@/components/ui/icons"
import { DataTableColumnHeader } from "@/components/data-table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { EMPLOYEE_STATUS_BADGE, EMPLOYEE_STATUS_LABELS } from "../../api/employee-ui-mappings"
import type { EmployeeListItem } from "../../api/types/employee"
import type { PermissionStatus } from "../../api/types/permission"
import { DeleteEmployeeDialog } from "../dialogs/dialog-delete-employee"

interface EmployeeColumnsOptions {
  onEdit: (employeeId: string) => void
}

function formatCampusNames(campuses: string[]) {
  return campuses.join(" · ")
}

/**
 * Une los nombres de los roles del funcionario con comas. Se usa para
 * mostrar el contenido resumido dentro del badge de la columna "Rol".
 */
function formatRoleNames(roles: EmployeeListItem["roles"]) {
  return roles.map((role) => role.name).join(", ")
}

/**
 * Une las etiquetas legibles de los estados del funcionario con comas.
 * Vacío cuando el funcionario aún no tiene permisos asociados.
 */
function formatStatusLabels(statuses: EmployeeListItem["statuses"]) {
  if (statuses.length === 0) {
    return "—"
  }

  return statuses.map((status) => EMPLOYEE_STATUS_LABELS[status]).join(", ")
}

/**
 * Color del badge de "Estado" cuando la lista trae varios estados
 * mezclados. Si hay al menos un permiso `SUSPENDED`, mostramos el color
 * "destructive" como señal de riesgo; si todos están `ACTIVE`, dejamos
 * el verde.
 */
function pickStatusColor(statuses: EmployeeListItem["statuses"]): "success" | "destructive" {
  return statuses.includes("SUSPENDED" satisfies PermissionStatus)
    ? "destructive"
    : "success"
}

export function createEmployeeColumns({ onEdit }: EmployeeColumnsOptions): ColumnDef<EmployeeListItem>[] {
  return [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        color="neutral"
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
        color="neutral"
        aria-label={`Seleccionar ${row.original.name}`}
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
    cell: ({ row }) => {
      const fullText = formatRoleNames(row.original.roles)

      return (
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge
                variant="soft"
                color="secondary"
                className="max-w-[16rem] truncate font-normal"
              >
                {fullText}
              </Badge>
            }
          />
          <TooltipContent>{fullText}</TooltipContent>
        </Tooltip>
      )
    },
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
      const statuses = row.original.statuses
      const fullText = formatStatusLabels(statuses)

      if (statuses.length === 0) {
        return (
          <Tooltip>
            <TooltipTrigger
              render={
                <Badge variant="outline" color="neutral" className="font-normal">
                  {fullText}
                </Badge>
              }
            />
            <TooltipContent>Sin permisos asignados</TooltipContent>
          </Tooltip>
        )
      }

      return (
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge
                {...EMPLOYEE_STATUS_BADGE[statuses[0]]}
                color={pickStatusColor(statuses)}
                className="max-w-[14rem] truncate font-normal"
              >
                {fullText}
              </Badge>
            }
          />
          <TooltipContent>{fullText}</TooltipContent>
        </Tooltip>
      )
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