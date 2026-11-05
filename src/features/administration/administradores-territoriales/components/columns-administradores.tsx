"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon, EyeIcon, PencilIcon, ProhibitIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import {
  documentoTexto,
  type AdministradorTerritorial,
} from "@/features/administration/administradores-territoriales/api/types/administrador"

interface CreateColumnsOptions {
  puedeEditar: boolean
  /** id del Administrador cuyo cambio de estado está en curso. */
  pendiente: number | null
  onVer: (s: AdministradorTerritorial) => void
  onModificar: (s: AdministradorTerritorial) => void
  onEstado: (s: AdministradorTerritorial) => void
}

/** Sin Eliminar: un Administrador territorial no se elimina, para conservar su trazabilidad (Sección 7.3). */
export function createAdministradoresColumns({
  puedeEditar,
  pendiente,
  onVer,
  onModificar,
  onEstado,
}: CreateColumnsOptions): ColumnDef<AdministradorTerritorial>[] {
  return [
    {
      id: "documento",
      accessorFn: documentoTexto,
      meta: { label: "Documento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
      cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{documentoTexto(row.original)}</span>,
    },
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Nombre" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => {
        const s = row.original
        return (
          <span className="flex flex-wrap items-center gap-1.5 font-medium">
            <span className={s.activo ? undefined : "text-muted-foreground"}>{s.nombre}</span>
            {s.activo && s.pendienteActivacion && (
              <Badge variant="soft" color="warning">
                Pendiente de activación
              </Badge>
            )}
          </span>
        )
      },
    },
    {
      id: "correo",
      accessorKey: "correo",
      meta: { label: "Correo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Correo" />,
      cell: ({ row }) => <span className="break-all text-muted-foreground">{row.original.correo}</span>,
    },
    {
      id: "dependencia",
      accessorFn: (row) => row.dependencia ?? "",
      meta: { label: "Dependencia" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dependencia" />,
      cell: ({ row }) => row.original.dependencia || <span className="text-muted-foreground">—</span>,
    },
    {
      id: "activo",
      accessorFn: (row) => (row.activo ? "Activo" : "Inactivo"),
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) =>
        row.original.activo ? (
          <Badge variant="soft" color="success">
            Activo
          </Badge>
        ) : (
          <Badge variant="outline" color="neutral">
            Inactivo
          </Badge>
        ),
      size: 110,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <AccionIcono label="Ver detalle" onClick={() => onVer(s)}>
              <EyeIcon />
            </AccionIcono>
            {puedeEditar && (
              <AccionIcono label="Modificar" onClick={() => onModificar(s)}>
                <PencilIcon />
              </AccionIcono>
            )}
            {puedeEditar && (
              <AccionIcono
                label={s.activo ? "Inactivar" : "Activar"}
                disabled={pendiente === s.pkAdministrador}
                onClick={() => onEstado(s)}
              >
                {s.activo ? <ProhibitIcon /> : <CheckCircleIcon />}
              </AccionIcono>
            )}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: 144,
    },
  ]
}

function AccionIcono({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" color="neutral" size="icon-sm" disabled={disabled} onClick={onClick} />}
      >
        <span className="sr-only">{label}</span>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
