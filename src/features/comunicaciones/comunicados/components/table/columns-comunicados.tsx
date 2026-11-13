"use no memo"

import { format } from "date-fns"
import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DotsThreeVerticalIcon, EyeIcon, PencilIcon, ProhibitIcon, XCircleIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"
import { EstadoComunicadoBadge } from "@/features/comunicaciones/chat/components/comunicado-panel"
import type { ComunicadoGestion } from "@/features/comunicaciones/comunicados/api/comunicados-gestion"
import { tiposAbreviados, tiposCompletos } from "@/features/comunicaciones/comunicados/lib/tipos-destinatario"

export type DialogoComunicado = { tipo: "anular" | "cancelar"; c: ComunicadoGestion }

/**
 * Columnas de Publicados (M.1.LIS.1). Los ids son los valores de `sortBy` que entiende comms-service
 * (fecha, titulo, publicadoPor, destinatarios, estado): el orden se resuelve en el servidor.
 */
export function createComunicadosColumns({
  onDialogo,
}: {
  onDialogo: (d: DialogoComunicado) => void
}): ColumnDef<ComunicadoGestion>[] {
  return [
    {
      id: "fecha",
      accessorKey: "publicarEn",
      meta: { label: "Fecha" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => (
        <time dateTime={row.original.publicarEn} className="tabular-nums">
          {format(new Date(row.original.publicarEn), "dd/MM/yyyy")}
        </time>
      ),
    },
    {
      id: "titulo",
      accessorKey: "titulo",
      meta: { label: "Título" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Título" />,
      cell: ({ row }) => (
        <Link
          to={paths.app.comunicacionesComunicadoDetalle.getHref(row.original.id)}
          title={row.original.titulo}
          className="block max-w-72 truncate font-medium hover:underline"
        >
          {row.original.titulo}
        </Link>
      ),
    },
    {
      id: "publicadoPor",
      accessorKey: "publicadoPor",
      meta: { label: "Publicado por" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Publicado por" />,
    },
    {
      id: "tipos",
      accessorFn: (row) => tiposAbreviados(row.tipos),
      enableSorting: false,
      meta: { label: "Tipos" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipos" />,
      cell: ({ row }) => <span title={tiposCompletos(row.original.tipos)}>{tiposAbreviados(row.original.tipos)}</span>,
    },
    {
      id: "destinatarios",
      accessorFn: (row) => row.destinatarios ?? 0,
      meta: { label: "Destinatarios", className: "text-right" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Destinatarios" className="justify-end" />
      ),
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {(row.original.destinatarios ?? 0).toLocaleString("es-CO")}
        </span>
      ),
    },
    {
      id: "estado",
      accessorKey: "estado",
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => <EstadoComunicadoBadge estado={row.original.estado} />,
    },
    {
      id: "actions",
      size: 48,
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => <MenuAccionesComunicado c={row.original} onDialogo={onDialogo} />,
    },
  ]
}

/** Menú ⁞ (M.1.LIS.2 y M.1.LIS.3): Modificar solo al autor; Cancelar los programados; Anular los publicados. */
export function MenuAccionesComunicado({
  c,
  onDialogo,
}: {
  c: ComunicadoGestion
  onDialogo: (d: DialogoComunicado) => void
}) {
  const vigente = c.estado === "PUBLICADO" || c.estado === "PROGRAMADO"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Opciones de ${c.titulo}`}
        className="grid size-8 place-items-center rounded-md hover:bg-muted"
      >
        <DotsThreeVerticalIcon className="size-4.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={<Link to={paths.app.comunicacionesComunicadoDetalle.getHref(c.id)} />}
          nativeButton={false}
        >
          <EyeIcon aria-hidden />
          Ver detalle
        </DropdownMenuItem>
        {c.esAutor && vigente && (
          <DropdownMenuItem
            render={<Link to={paths.app.comunicacionesComunicadoEditar.getHref(c.id)} />}
            nativeButton={false}
          >
            <PencilIcon aria-hidden />
            Modificar
          </DropdownMenuItem>
        )}
        {c.estado === "PROGRAMADO" && (
          <DropdownMenuItem onClick={() => onDialogo({ tipo: "cancelar", c })}>
            <XCircleIcon aria-hidden />
            Cancelar comunicado
          </DropdownMenuItem>
        )}
        {c.estado === "PUBLICADO" && (
          <DropdownMenuItem variant="destructive" onClick={() => onDialogo({ tipo: "anular", c })}>
            <ProhibitIcon aria-hidden />
            Anular
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
