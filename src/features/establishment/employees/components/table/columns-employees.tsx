"use no memo"

import type { ComponentProps, ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EyeIcon, PencilIcon, ShieldIcon } from "@/components/ui/icons"
import { DataTableColumnHeader } from "@/components/data-table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { paths } from "@/config/paths"

import { ESTADO_FUNCIONARIO_BADGE, ESTADO_FUNCIONARIO_LABELS } from "@/features/establishment/employees/api/ui-mappings"
import type { FuncionarioListItem } from "@/features/establishment/employees/api/types/funcionario"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

interface EmployeeColumnsOptions {
  establishmentId: number | null
}

function ActionButton({ label, children, ...rest }: { label: string; children: ReactNode } & ComponentProps<typeof Button>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" color="neutral" size="icon-sm" aria-label={label} {...rest} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function ActionsCell({ employee, establishmentId }: { employee: FuncionarioListItem } & EmployeeColumnsOptions) {
  const { puedeEditar } = useMenuPermission("FUNCIONARIOS")
  const search = { establecimiento: establishmentId ?? undefined }

  return (
    <div className="flex items-center justify-end gap-1">
      <ActionButton
        label="Ver detalle"
        render={<Link to={paths.app.establishments.officialDetail.getHref(employee.id)} search={search} />}
        nativeButton={false}
      >
        <EyeIcon />
      </ActionButton>
      {puedeEditar ? (
        <>
          <ActionButton
            label="Modificar"
            render={<Link to={paths.app.establishments.officialEdit.getHref(employee.id)} search={search} />}
            nativeButton={false}
          >
            <PencilIcon />
          </ActionButton>
          <ActionButton
            label="Roles y permisos"
            render={<Link to={paths.app.establishments.officialRoles.getHref(employee.id)} search={search} />}
            nativeButton={false}
          >
            <ShieldIcon />
          </ActionButton>
        </>
      ) : null}
    </div>
  )
}

/** Columnas de la Sección 4: Documento, Nombre, Roles, Designaciones y Estado. */
export function createColumns(options: EmployeeColumnsOptions): ColumnDef<FuncionarioListItem>[] {
  return [
    {
      accessorKey: "documentNumber",
      id: "document",
      meta: { label: "Documento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {[row.original.documentType, row.original.documentNumber].filter(Boolean).join(" ")}
        </span>
      ),
    },
    {
      accessorKey: "name",
      id: "name",
      meta: { label: "Nombre" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col items-start gap-1">
          <span className="truncate">{row.original.name}</span>
          {row.original.isSupport ? (
            <Badge variant="outline" color="neutral">
              Usuario de soporte
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "roles",
      id: "roles",
      meta: { label: "Roles" },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Roles" />,
      cell: ({ row }) => <div className="max-w-xs">{row.original.roles.join(", ") || "—"}</div>,
    },
    {
      accessorKey: "designations",
      id: "designations",
      meta: { label: "Designaciones" },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Designaciones" />,
      cell: ({ row }) => <div className="max-w-xs">{row.original.designations.join(", ") || "—"}</div>,
    },
    {
      accessorKey: "status",
      id: "status",
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => (
        <Badge {...ESTADO_FUNCIONARIO_BADGE[row.original.status]}>{ESTADO_FUNCIONARIO_LABELS[row.original.status]}</Badge>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      size: 144,
      cell: ({ row }) => <ActionsCell employee={row.original} {...options} />,
    },
  ]
}
