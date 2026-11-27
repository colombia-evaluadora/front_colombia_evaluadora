import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { ChatTextIcon, EyeIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { OrientacionRecibida } from "@/features/establishment/institution/api/types/orientacion"
import { EstadoOrientacionBadge } from "@/features/establishment/institution/components/orientaciones/estado-orientacion-badge"
import { fechaCorta } from "@/features/establishment/institution/utils/orientaciones"

interface ColumnsOptions {
  onVer: (orientacion: OrientacionRecibida) => void
  onResponder: (orientacion: OrientacionRecibida) => void
  puedeResponder: boolean
}

/**
 * Columnas de Orientaciones (informe, 2.3). Los ids de las ordenables son los que acepta el backend en
 * `SORTING.ID`; Estado no se ordena.
 */
export function createOrientacionesColumns({ onVer, onResponder, puedeResponder }: ColumnsOptions) {
  const columns: ColumnDef<OrientacionRecibida>[] = [
    {
      accessorKey: "fechaEnvio",
      id: "fechaEnvio",
      meta: { label: "Fecha de envío" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de envío" />,
      cell: ({ row }) => (
        <span className="tabular-nums">{fechaCorta(row.original.fechaEnvio)}</span>
      ),
    },
    {
      accessorKey: "tema",
      id: "tema",
      meta: { label: "Tema" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tema" />,
    },
    {
      accessorKey: "orientacion",
      id: "orientacion",
      meta: { label: "Orientación" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Orientación" />,
      cell: ({ row }) => (
        <span className="block max-w-80 truncate" title={row.original.orientacion}>
          {row.original.orientacion}
        </span>
      ),
    },
    {
      accessorKey: "enviadaPor",
      id: "enviadaPor",
      meta: { label: "Enviada por" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Enviada por" />,
    },
    {
      accessorKey: "estado",
      id: "estado",
      meta: { label: "Estado" },
      enableSorting: false,
      header: "Estado",
      cell: ({ row }) => <EstadoOrientacionBadge estado={row.original.estado} />,
    },
    {
      accessorKey: "fechaAtencion",
      id: "fechaAtencion",
      meta: { label: "Fecha de atención" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de atención" />,
      cell: ({ row }) => (
        <span className="tabular-nums">{fechaCorta(row.original.fechaAtencion)}</span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: 96,
      cell: ({ row }) => {
        const orientacion = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    aria-label={`Ver detalle de la orientación sobre ${orientacion.tema}`}
                    onClick={() => onVer(orientacion)}
                  />
                }
              >
                <EyeIcon />
              </TooltipTrigger>
              <TooltipContent>Ver detalle</TooltipContent>
            </Tooltip>
            {/* Responder solo en las Enviadas: una Atendida no se modifica. */}
            {puedeResponder && orientacion.estado === "ENVIADA" ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      color="neutral"
                      size="icon-sm"
                      aria-label={`Responder la orientación sobre ${orientacion.tema}`}
                      onClick={() => onResponder(orientacion)}
                    />
                  }
                >
                  <ChatTextIcon />
                </TooltipTrigger>
                <TooltipContent>Responder</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        )
      },
    },
  ]
  return columns
}
