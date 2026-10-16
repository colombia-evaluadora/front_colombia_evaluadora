"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon, EyeIcon, InfoIcon, PencilIcon, ProhibitIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import {
  CRITERIO_EN_USO_MENSAJE,
  bloqueCampoTexto,
  type CriterioPrioridad,
} from "@/features/administration/criterios-prioridad/api/types/criterio-prioridad"

interface CreateColumnsOptions {
  puedeEditar: boolean
  puedeEliminar: boolean
  /** pk del criterio cuya acción (estado o eliminar) está en curso. */
  pendiente: number | null
  onVer: (criterio: CriterioPrioridad) => void
  onModificar: (criterio: CriterioPrioridad) => void
  onEstado: (criterio: CriterioPrioridad) => void
  /** `false` deja abierta la confirmación (falló). */
  onEliminar: (criterio: CriterioPrioridad) => Promise<boolean>
}

/** "Es uno de (2)": cuántos valores eligió. */
export const reglaTexto = (criterio: CriterioPrioridad) =>
  criterio.regla.codigo === "ES_UNO_DE"
    ? `${criterio.regla.nombre} (${criterio.valores.length})`
    : criterio.regla.nombre

export function createCriteriosPrioridadColumns({
  puedeEditar,
  puedeEliminar,
  pendiente,
  onVer,
  onModificar,
  onEstado,
  onEliminar,
}: CreateColumnsOptions): ColumnDef<CriterioPrioridad>[] {
  return [
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Criterio" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Criterio" />,
      cell: ({ row }) => {
        const criterio = row.original
        return (
          <span className="flex flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-1.5 font-medium">
              <span className={criterio.habilitado ? undefined : "text-muted-foreground"}>
                {criterio.nombre}
              </span>
              {criterio.enUso && (
                <Badge variant="soft" color="info">
                  En uso
                </Badge>
              )}
            </span>
            {criterio.descripcion && (
              <span className="line-clamp-1 text-xs text-muted-foreground">
                {criterio.descripcion}
              </span>
            )}
          </span>
        )
      },
    },
    {
      id: "campo",
      accessorFn: (row) => bloqueCampoTexto(row.campo),
      meta: { label: "Bloque · Campo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Bloque · Campo" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{bloqueCampoTexto(row.original.campo)}</span>
      ),
    },
    {
      id: "regla",
      accessorFn: reglaTexto,
      meta: { label: "Regla" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Regla" />,
      cell: ({ row }) => reglaTexto(row.original),
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
      size: 110,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const criterio = row.original
        const ocupado = pendiente === criterio.pkCriterio
        return (
          <div className="flex items-center justify-end gap-1">
            <AccionIcono label="Ver detalle" onClick={() => onVer(criterio)}>
              <EyeIcon />
            </AccionIcono>
            {puedeEditar && !criterio.enUso && (
              <AccionIcono label="Modificar" onClick={() => onModificar(criterio)}>
                <PencilIcon />
              </AccionIcono>
            )}
            {puedeEditar && (
              <AccionIcono
                label={criterio.habilitado ? "Desactivar" : "Activar"}
                disabled={ocupado}
                onClick={() => onEstado(criterio)}
              >
                {criterio.habilitado ? <ProhibitIcon /> : <CheckCircleIcon />}
              </AccionIcono>
            )}
            {puedeEliminar && !criterio.enUso && (
              <ConfirmRemoveButton
                label={`Eliminar ${criterio.nombre}`}
                title="Eliminar criterio de prioridad"
                description={
                  <>
                    Se eliminará «{criterio.nombre}» de los criterios de prioridad. Esta acción no
                    se puede deshacer.
                  </>
                }
                disabled={ocupado}
                onConfirm={() => onEliminar(criterio)}
              />
            )}
            {(puedeEditar || puedeEliminar) &&
              criterio.enUso && (
                // En uso no se modifica ni se elimina: en su lugar, el porqué.
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
                    <span className="sr-only">{CRITERIO_EN_USO_MENSAJE}</span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-72">{CRITERIO_EN_USO_MENSAJE}</TooltipContent>
                </Tooltip>
              )}
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
