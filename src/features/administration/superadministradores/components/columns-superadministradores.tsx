"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon, EyeIcon, InfoIcon, PencilIcon, ProhibitIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import {
  NO_PUEDE_INACTIVARSE_MENSAJE,
  documentoTexto,
  type Superadministrador,
} from "@/features/administration/superadministradores/api/types/superadministrador"

interface CreateColumnsOptions {
  puedeEditar: boolean
  /** id del Superadministrador cuyo cambio de estado está en curso. */
  pendiente: number | null
  onVer: (s: Superadministrador) => void
  onModificar: (s: Superadministrador) => void
  onEstado: (s: Superadministrador) => void
}

/** Sin Eliminar: un Superadministrador no se elimina (Regla 9). */
export function createSuperadministradoresColumns({
  puedeEditar,
  pendiente,
  onVer,
  onModificar,
  onEstado,
}: CreateColumnsOptions): ColumnDef<Superadministrador>[] {
  return [
    {
      id: "documento",
      accessorFn: documentoTexto,
      meta: { label: "Documento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
      cell: ({ row }) => <span className="tabular-nums">{documentoTexto(row.original)}</span>,
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
            {s.esUsted && <span className="font-normal text-muted-foreground">(usted)</span>}
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
      // Completo, sin recortar (Sección 7).
      id: "correo",
      accessorKey: "correo",
      meta: { label: "Correo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Correo" />,
      cell: ({ row }) => (
        <span className="break-all text-muted-foreground">{row.original.correo}</span>
      ),
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
            {puedeEditar && !s.esUsted && (
              <AccionIcono
                label={s.activo ? "Inactivar" : "Activar"}
                disabled={pendiente === s.pkSuperadministrador}
                onClick={() => onEstado(s)}
              >
                {s.activo ? <ProhibitIcon /> : <CheckCircleIcon />}
              </AccionIcono>
            )}
            {puedeEditar &&
              s.esUsted && (
                // En la fila propia no aparece Inactivar: en su lugar, el porqué.
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span
                        tabIndex={0}
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      />
                    }
                  >
                    <InfoIcon className="size-4" />
                    <span className="sr-only">{NO_PUEDE_INACTIVARSE_MENSAJE}</span>
                  </TooltipTrigger>
                  <TooltipContent>{NO_PUEDE_INACTIVARSE_MENSAJE}</TooltipContent>
                </Tooltip>
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
        render={
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            disabled={disabled}
            onClick={onClick}
          />
        }
      >
        <span className="sr-only">{label}</span>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
