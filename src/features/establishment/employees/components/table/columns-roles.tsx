"use no memo"

import type { ComponentProps, ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarIcon, PauseCircleIcon, PlayCircleIcon, ShieldIcon, TrashIcon } from "@/components/ui/icons"
import { DataTableColumnHeader } from "@/components/data-table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { paths } from "@/config/paths"

import type { RolAsignado } from "@/features/establishment/employees/api/types/rol-asignado"
import { DIAS_AVISO_VENCIMIENTO, fechaCorta } from "@/features/establishment/employees/utils/rol-asignado"

export type AccionRol = "inactivar" | "activar" | "prorrogar" | "eliminar"

interface RolesColumnsOptions {
  funcionarioId: number
  establishmentId: number
  onAction: (accion: AccionRol, rol: RolAsignado) => void
}

function ActionButton({ label, children, ...rest }: { label: string; children: ReactNode } & ComponentProps<typeof Button>) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" color="neutral" size="icon-sm" aria-label={label} {...rest} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function ActionsCell({ rol, funcionarioId, establishmentId, onAction }: { rol: RolAsignado } & RolesColumnsOptions) {
  if (!rol.canManage) return null
  const activo = rol.status === "ACTIVO"
  return (
    <div className="flex items-center justify-end gap-1">
      {activo ? (
        <ActionButton label="Inactivar" type="button" onClick={() => onAction("inactivar", rol)}>
          <PauseCircleIcon />
        </ActionButton>
      ) : (
        <ActionButton label="Activar" type="button" onClick={() => onAction("activar", rol)}>
          <PlayCircleIcon />
        </ActionButton>
      )}
      {rol.canRestrict ? (
        <ActionButton
          label="Permisos"
          render={
            <Link
              to={paths.app.establishments.officialRolePermissions.getHref(funcionarioId, rol.id)}
              search={{ establecimiento: establishmentId }}
            />
          }
          nativeButton={false}
        >
          <ShieldIcon />
        </ActionButton>
      ) : null}
      {rol.validUntil ? (
        <ActionButton label="Prorrogar" type="button" onClick={() => onAction("prorrogar", rol)}>
          <CalendarIcon />
        </ActionButton>
      ) : null}
      <ActionButton label="Eliminar" type="button" onClick={() => onAction("eliminar", rol)}>
        <TrashIcon />
      </ActionButton>
    </div>
  )
}

/** Marca: el rol del panel del Establecimiento (Regla 83), o que vence pronto o ya venció (Regla 94). */
function Marca({ rol }: { rol: RolAsignado }) {
  if (rol.principalDe) {
    return (
      <Badge variant="soft" color="neutral">
        Asignado desde el Establecimiento
      </Badge>
    )
  }
  if (rol.expired) {
    return (
      <Badge variant="soft" color="destructive">
        Vencido
      </Badge>
    )
  }
  if (rol.daysToExpire != null && rol.daysToExpire <= DIAS_AVISO_VENCIMIENTO) {
    return (
      <Badge variant="soft" color="warning">
        {rol.daysToExpire === 0 ? "Vence hoy" : rol.daysToExpire === 1 ? "Vence en 1 día" : `Vence en ${rol.daysToExpire} días`}
      </Badge>
    )
  }
  return null
}

/** Columnas de Roles y permisos (Sección 4.2): Rol, Sede educativa, Jornada, Vigente hasta, Estado y Marca. */
export function createRolesColumns(options: RolesColumnsOptions): ColumnDef<RolAsignado>[] {
  return [
    {
      accessorKey: "roleName",
      id: "role",
      meta: { label: "Rol" },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Rol" />,
      cell: ({ row }) => <span className="font-medium">{row.original.roleName}</span>,
    },
    {
      accessorKey: "campusName",
      id: "campus",
      meta: { label: "Sede educativa" },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sede educativa" />,
      cell: ({ row }) => <div className="max-w-64 whitespace-normal">{row.original.campusName}</div>,
    },
    {
      accessorKey: "workScheduleName",
      id: "workSchedule",
      meta: { label: "Jornada" },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
    },
    {
      accessorKey: "validUntil",
      id: "validUntil",
      meta: { label: "Vigente hasta" },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vigente hasta" />,
      cell: ({ row }) =>
        row.original.validUntil ? (
          <span className="tabular-nums">{fechaCorta(row.original.validUntil)}</span>
        ) : (
          <span className="text-muted-foreground">Sin vencimiento</span>
        ),
    },
    {
      accessorKey: "status",
      id: "status",
      meta: { label: "Estado" },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) =>
        row.original.status === "ACTIVO" ? (
          <Badge variant="soft" color="success">
            Activo
          </Badge>
        ) : (
          <Badge variant="soft" color="muted">
            Inactivo
          </Badge>
        ),
    },
    {
      id: "mark",
      meta: { label: "Marca" },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Marca" />,
      cell: ({ row }) => <Marca rol={row.original} />,
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      size: 144,
      cell: ({ row }) => <ActionsCell rol={row.original} {...options} />,
    },
  ]
}
