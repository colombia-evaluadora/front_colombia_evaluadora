"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CheckCircleIcon, DotsThreeVerticalIcon, EyeIcon, PencilIcon, ProhibitIcon } from "@/components/ui/icons"

import {
  documentoTexto,
  establecimientosTexto,
  type SupervisorTerritorial,
} from "@/features/administration/supervisores-territoriales/api/types/supervisor"

interface CreateColumnsOptions {
  puedeEditar: boolean
  /** id del Supervisor cuyo cambio de estado está en curso. */
  pendiente: number | null
  onVer: (s: SupervisorTerritorial) => void
  onModificar: (s: SupervisorTerritorial) => void
  onEstado: (s: SupervisorTerritorial) => void
}

/** Sin Eliminar: un Supervisor territorial no se elimina, para conservar su trazabilidad (Sección 7.2). */
export function createSupervisoresColumns({
  puedeEditar,
  pendiente,
  onVer,
  onModificar,
  onEstado,
}: CreateColumnsOptions): ColumnDef<SupervisorTerritorial>[] {
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
      id: "establecimientos",
      accessorFn: establecimientosTexto,
      meta: { label: "Establecimientos a cargo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Establecimientos a cargo" />,
      cell: ({ row }) => {
        const s = row.original
        return (
          <span
            className="tabular-nums"
            title={s.todosEstablecimientos ? "Todos, también los que se creen después" : s.establecimientos.map((e) => e.nombre).join(", ")}
          >
            {establecimientosTexto(s)}
          </span>
        )
      },
      size: 120,
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
      enableSorting: false,
      enableHiding: false,
      size: 48,
      cell: ({ row }) => {
        const s = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones de ${s.nombre}`} />
              }
            >
              <DotsThreeVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 *:whitespace-nowrap">
              <DropdownMenuItem onClick={() => onVer(s)}>
                <EyeIcon />
                Ver detalle
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!puedeEditar} onClick={() => onModificar(s)}>
                <PencilIcon />
                Modificar
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!puedeEditar || pendiente === s.pkSupervisor} onClick={() => onEstado(s)}>
                {s.activo ? <ProhibitIcon /> : <CheckCircleIcon />}
                {s.activo ? "Inactivar" : "Activar"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
