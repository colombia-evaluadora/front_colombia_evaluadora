import type { ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon, PencilIcon, ProhibitIcon, TrashIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { colorDeTipo } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import type { CodigoRow } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/types"

interface Opciones {
  puedeEditar: boolean
  puedeEliminar: boolean
  onModificar: (c: CodigoRow) => void
  onCambiarEstado: (c: CodigoRow) => void
  onEliminar: (c: CodigoRow) => void
}

function Accion({ etiqueta, disabled, onClick, children }: { etiqueta: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={etiqueta} disabled={disabled} onClick={onClick} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{etiqueta}</TooltipContent>
    </Tooltip>
  )
}

/** Listado de 2.1: Código · Descripción · Tipo · Tipo de situación · Estado. */
export function buildColumnsCodigos({ puedeEditar, puedeEliminar, onModificar, onCambiarEstado, onEliminar }: Opciones): ColumnDef<CodigoRow>[] {
  return [
    {
      id: "codigo",
      accessorKey: "codigo",
      enableSorting: false,
      enableHiding: false,
      meta: { label: "Código" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Código" />,
      cell: ({ row }) => <span className="font-semibold">{row.original.codigo}</span>,
    },
    {
      id: "descripcion",
      accessorKey: "descripcion",
      enableSorting: false,
      enableHiding: false,
      meta: { label: "Descripción" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      cell: ({ row }) => <span className="whitespace-normal">{row.original.descripcion}</span>,
    },
    {
      id: "tipo",
      accessorKey: "tipo_nombre",
      enableSorting: false,
      meta: { label: "Tipo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => (
        <Badge variant="soft" color={colorDeTipo(row.original.tipo_nombre)}>
          {row.original.tipo_nombre}
        </Badge>
      ),
    },
    {
      id: "situacion",
      accessorKey: "situacion_nombre",
      enableSorting: false,
      meta: { label: "Tipo de situación" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de situación" />,
      cell: ({ row }) => row.original.situacion_nombre ?? "—",
    },
    {
      id: "estado",
      accessorKey: "habilitado",
      enableSorting: false,
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => (
        <Badge variant="soft" color={row.original.habilitado ? "success" : "muted"}>
          {row.original.habilitado ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      // Tres botones al pasar el cursor, como en Referentes: modificar, activar/inactivar y eliminar.
      size: 120,
      cell: ({ row }) => {
        const c = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            {puedeEditar && (
              <Accion etiqueta={`Modificar ${c.codigo}`} onClick={() => onModificar(c)}>
                <PencilIcon />
              </Accion>
            )}
            {puedeEditar && (
              <Accion etiqueta={`${c.habilitado ? "Inactivar" : "Activar"} ${c.codigo}`} onClick={() => onCambiarEstado(c)}>
                {c.habilitado ? <ProhibitIcon /> : <CheckCircleIcon />}
              </Accion>
            )}
            {puedeEliminar && (
              <Accion
                etiqueta={c.en_uso ? `${c.codigo} ya se usó en anotaciones: puede inactivarlo` : `Eliminar ${c.codigo}`}
                disabled={c.en_uso}
                onClick={() => onEliminar(c)}
              >
                <TrashIcon />
              </Accion>
            )}
          </div>
        )
      },
    },
  ]
}
