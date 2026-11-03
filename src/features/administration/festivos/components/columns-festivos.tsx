"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon, InfoIcon, PencilIcon, ProhibitIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import {
  FESTIVO_EN_USO_MENSAJE,
  TIPO_FECHA_LABELS,
  type Festivo,
} from "@/features/administration/festivos/api/types"
import { fechaTexto, reglaTexto } from "@/features/administration/festivos/lib/fecha-festivo"

interface CreateColumnsOptions {
  puedeEditar: boolean
  puedeEliminar: boolean
  /** pk del festivo cuya acción (estado o eliminar) está en curso. */
  pendiente: number | null
  onModificar: (festivo: Festivo) => void
  onEstado: (festivo: Festivo) => void
  /** `false` deja abierta la confirmación (falló). */
  onEliminar: (festivo: Festivo) => Promise<boolean>
}

export function createFestivosColumns({
  puedeEditar,
  puedeEliminar,
  pendiente,
  onModificar,
  onEstado,
  onEliminar,
}: CreateColumnsOptions): ColumnDef<Festivo>[] {
  return [
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Festivo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Festivo" />,
      cell: ({ row }) => (
        <span className={row.original.habilitado ? "font-medium" : "font-medium text-muted-foreground"}>
          {row.original.nombre}
        </span>
      ),
    },
    {
      id: "tipoFecha",
      accessorFn: (row) => TIPO_FECHA_LABELS[row.tipoFecha],
      meta: { label: "Tipo de fecha" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de fecha" />,
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span>{TIPO_FECHA_LABELS[row.original.tipoFecha]}</span>
          <span className="text-xs text-muted-foreground">{reglaTexto(row.original)}</span>
        </span>
      ),
    },
    {
      id: "fechaAnioEnCurso",
      accessorKey: "fechaAnioEnCurso",
      meta: { label: "Fecha del año en curso" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={`Fecha en ${new Date().getFullYear()}`} />
      ),
      cell: ({ row }) => (
        <span className="first-letter:uppercase tabular-nums">
          {fechaTexto(row.original.fechaAnioEnCurso)}
        </span>
      ),
    },
    {
      id: "habilitado",
      accessorFn: (row) => (row.habilitado ? "Activo" : "Inactivo"),
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) =>
        row.original.habilitado ? (
          <Badge variant="soft" color="success">
            Activo
          </Badge>
        ) : (
          <Badge variant="outline" color="neutral">
            Inactivo
          </Badge>
        ),
      size: 120,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const festivo = row.original
        const ocupado = pendiente === festivo.pkFestivo
        return (
          <div className="flex items-center justify-end gap-1">
            {puedeEditar && (
              <AccionIcono label="Modificar" onClick={() => onModificar(festivo)}>
                <PencilIcon />
              </AccionIcono>
            )}
            {puedeEditar && (
              <AccionIcono
                label={festivo.habilitado ? "Inactivar" : "Activar"}
                disabled={ocupado}
                onClick={() => onEstado(festivo)}
              >
                {festivo.habilitado ? <ProhibitIcon /> : <CheckCircleIcon />}
              </AccionIcono>
            )}
            {puedeEliminar &&
              (festivo.enUso ? (
                // En uso no se elimina: en su lugar, el porqué.
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
                    <span className="sr-only">{FESTIVO_EN_USO_MENSAJE}</span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-72">{FESTIVO_EN_USO_MENSAJE}</TooltipContent>
                </Tooltip>
              ) : (
                <ConfirmRemoveButton
                  label={`Eliminar ${festivo.nombre}`}
                  title="Eliminar festivo"
                  description={
                    <>
                      Se eliminará «{festivo.nombre}» de la lista y de los calendarios de los períodos
                      que aún no han comenzado. Esta acción no se puede deshacer.
                    </>
                  }
                  disabled={ocupado}
                  onConfirm={() => onEliminar(festivo)}
                />
              ))}
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
