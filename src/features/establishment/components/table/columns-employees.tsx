import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { PencilIcon } from "@/components/ui/icons"
import { DataTableColumnHeader } from "@/components/data-table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { EMPLOYEE_STATUS_BADGE, EMPLOYEE_STATUS_LABELS } from "../../api/employee-ui-mappings"
import type { EmployeeListItem } from "../../api/types/employee"
import { DeleteEmployeeDialog } from "../dialogs/dialog-delete-employee"

interface EmployeeColumnsOptions {
  onEdit: (employeeId: string) => void
}

// Cuántas sedes se listan por nombre antes de resumir el resto en un "+N".
//
// Es 1 y no 2 porque el "+N" cuenta lo que NO se renderiza, no lo que no entra:
// con 2 los nombres de sede rara vez caben en el ancho de la columna y el
// segundo se lo comía el `truncate`, así que se veía una sede y un "+1" cuando
// en realidad quedaban dos escondidas.
const VISIBLE_CAMPUSES = 1

function formatCampusNames(campuses: string[]) {
  return campuses.join(", ")
}

/**
 * Une los nombres de los roles del funcionario con comas. Se usa para
 * mostrar el contenido resumido dentro del badge de la columna "Rol".
 */
function formatRoleNames(roles: EmployeeListItem["roles"]) {
  return roles.map((role) => role.name).join(", ")
}

/**
 * Un badge por estado, no uno solo con los estados concatenados: cuando el
 * funcionario mezcla permisos `ACTIVE` y `SUSPENDED`, un único badge tendría
 * que elegir un color para dos estados opuestos ("Activo, Suspendido" en
 * rojo). Separados, cada uno lleva su color —verde activo, rojo suspendido—
 * y la mezcla se lee sola.
 */
function renderStatusCell(statuses: EmployeeListItem["statuses"]) {
  if (statuses.length === 0) {
    return "—"
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {statuses.map((status) => (
        <Badge key={status} {...EMPLOYEE_STATUS_BADGE[status]}>
          {EMPLOYEE_STATUS_LABELS[status]}
        </Badge>
      ))}
    </div>
  )
}

export function createEmployeeColumns({ onEdit }: EmployeeColumnsOptions): ColumnDef<EmployeeListItem>[] {
  return [
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
    meta: { label: "N° Documento" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="N° Documento" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.documentNumber}</span>,
  },
  {
    accessorKey: "name",
    id: "name",
    meta: { label: "Nombre" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => <p className="uppercase font-bold">{row.original.name}</p>,
  },
  {
    accessorKey: "role",
    id: "role",
    meta: { label: "Rol" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Rol" />,
    cell: ({ row }) => {
      if (row.original.roles.length === 0) {
        return <span className="text-sm text-foreground">—</span>
      }

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
    meta: { label: "Sede educativa" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sede educativa" />,
    enableSorting: false,
    cell: ({ row }) => {
      const campuses = row.original.campuses

      if (campuses.length === 0) {
        return <span className="text-sm text-foreground">—</span>
      }

      const extra = campuses.length - VISIBLE_CAMPUSES

      return (
        <Tooltip>
          <TooltipTrigger
            render={
              // El "+N" va fuera del `truncate` y con `shrink-0`: si compartiera
              // el bloque que se recorta, se lo comerían los puntos suspensivos
              // justo cuando hace falta leerlo.
              <div className="flex max-w-[18rem] items-center gap-1 text-sm text-foreground">
                <span className="truncate">
                  {formatCampusNames(campuses.slice(0, VISIBLE_CAMPUSES))}
                </span>
                {extra > 0 ? (
                  <span className="shrink-0 text-muted-foreground">+{extra}</span>
                ) : null}
              </div>
            }
          />
          <TooltipContent>{formatCampusNames(campuses)}</TooltipContent>
        </Tooltip>
      )
    },
  },
  {
    accessorKey: "workSchedule",
    id: "workSchedule",
    meta: { label: "Jornada" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
    cell: ({ row }) => {
      const workSchedule = row.original.workSchedule

      if (!workSchedule) {
        return <span className="text-sm text-foreground">—</span>
      }

      return (
        <Badge variant="soft" color="neutral">
          {workSchedule.name}
        </Badge>
      )
    },
  },
  {
    accessorKey: "status",
    id: "status",
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => (
      <span className="text-sm text-foreground">
        {renderStatusCell(row.original.statuses)}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          color="neutral"
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