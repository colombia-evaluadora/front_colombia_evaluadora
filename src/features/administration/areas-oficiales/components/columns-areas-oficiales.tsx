"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon, EyeIcon, InfoIcon, PencilIcon, ProhibitIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import {
  AREA_EN_USO_MENSAJE,
  DIMENSION_TRANSVERSAL_LABEL,
  type AreaOficial,
} from "@/features/administration/areas-oficiales/api/types/area-oficial"

interface CreateColumnsOptions {
  puedeEditar: boolean
  puedeEliminar: boolean
  /** pk del área cuya acción (estado o eliminar) está en curso. */
  pendiente: number | null
  onVer: (area: AreaOficial) => void
  onModificar: (area: AreaOficial) => void
  onEstado: (area: AreaOficial) => void
  /** `false` deja abierta la confirmación (falló). */
  onEliminar: (area: AreaOficial) => Promise<boolean>
}

export const nivelesTexto = (area: AreaOficial) => area.niveles.map((n) => n.nombre).join(", ")

export function createAreasOficialesColumns({
  puedeEditar,
  puedeEliminar,
  pendiente,
  onVer,
  onModificar,
  onEstado,
  onEliminar,
}: CreateColumnsOptions): ColumnDef<AreaOficial>[] {
  return [
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Área oficial" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Área oficial" />,
      cell: ({ row }) => {
        const area = row.original
        return (
          <span className="flex flex-wrap items-center gap-1.5 font-medium">
            <span className={area.habilitada ? undefined : "text-muted-foreground"}>
              {area.nombre}
            </span>
            {area.esDimensionTransversal && (
              <Badge variant="soft" color="info">
                {DIMENSION_TRANSVERSAL_LABEL}
              </Badge>
            )}
          </span>
        )
      },
    },
    {
      id: "niveles",
      accessorFn: nivelesTexto,
      meta: { label: "Niveles educativos" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Niveles educativos" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{nivelesTexto(row.original) || "—"}</span>
      ),
    },
    {
      id: "habilitada",
      accessorFn: (row) => (row.habilitada ? "Activa" : "Inactiva"),
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) =>
        row.original.habilitada ? (
          <Badge variant="soft" color="success">
            Activa
          </Badge>
        ) : (
          <Badge variant="outline" color="neutral">
            Inactiva
          </Badge>
        ),
      size: 120,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const area = row.original
        const ocupada = pendiente === area.pkAreaOficial
        return (
          <div className="flex items-center justify-end gap-1">
            <AccionIcono label="Ver detalle" onClick={() => onVer(area)}>
              <EyeIcon />
            </AccionIcono>
            {puedeEditar && (
              <AccionIcono label="Modificar" onClick={() => onModificar(area)}>
                <PencilIcon />
              </AccionIcono>
            )}
            {puedeEditar && (
              <AccionIcono
                label={area.habilitada ? "Inactivar" : "Activar"}
                disabled={ocupada}
                onClick={() => onEstado(area)}
              >
                {area.habilitada ? <ProhibitIcon /> : <CheckCircleIcon />}
              </AccionIcono>
            )}
            {puedeEliminar &&
              (area.enUso ? (
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
                    <span className="sr-only">{AREA_EN_USO_MENSAJE}</span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-72">{AREA_EN_USO_MENSAJE}</TooltipContent>
                </Tooltip>
              ) : (
                <ConfirmRemoveButton
                  label={`Eliminar ${area.nombre}`}
                  title="Eliminar área oficial"
                  description={
                    <>
                      Se eliminará «{area.nombre}» del catálogo de áreas oficiales. Esta acción no
                      se puede deshacer.
                    </>
                  }
                  disabled={ocupada}
                  onConfirm={() => onEliminar(area)}
                />
              ))}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: 192,
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
