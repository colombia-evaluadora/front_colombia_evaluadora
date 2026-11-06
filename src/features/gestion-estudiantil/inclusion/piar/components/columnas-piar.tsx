import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DotsThreeVerticalIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import type { PiarRow } from "@/features/gestion-estudiantil/inclusion/piar/api/types"
import { COLOR_ESTADO, esEditable } from "@/features/gestion-estudiantil/inclusion/piar/utils/piar"

interface Opciones {
  access: { puedeGestionar: boolean }
  prefetch: (id: number) => void
  irFicha: (row: PiarRow, accion?: "acta" | "cerrar") => void
}

export function buildColumnasPiar({ access, prefetch, irFicha }: Opciones): ColumnDef<PiarRow>[] {
  return [
    {
      id: "estudiante",
      accessorKey: "estudiante_nombre",
      enableSorting: false,
      header: "Estudiante",
      cell: ({ row }) => (
        <Link className="text-primary hover:underline" to={paths.app.piarFicha.getHref(row.original.id)} onMouseEnter={() => prefetch(row.original.id)}>
          {row.original.estudiante_nombre}
        </Link>
      ),
    },
    { id: "grado_grupo", accessorKey: "grado_grupo", enableSorting: false, header: "Grado/Grupo" },
    {
      id: "condicion",
      accessorKey: "condicion",
      enableSorting: false,
      header: "Condición",
      cell: ({ row }) => row.original.condicion ?? "—",
    },
    {
      id: "estado",
      accessorKey: "estado_nombre",
      enableSorting: false,
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant="soft" color={COLOR_ESTADO[row.original.estado_codigo] ?? "muted"}>
          <span>{row.original.estado_nombre}</span>
        </Badge>
      ),
    },
    {
      id: "ajustes",
      accessorKey: "ajustes",
      enableSorting: false,
      header: "Ajustes",
      cell: ({ row }) => <span className="block text-right tabular-nums">{row.original.ajustes}</span>,
    },
    {
      id: "pendientes",
      accessorKey: "seguimientos_pendientes",
      enableSorting: false,
      header: "Seguimientos pendientes",
      cell: ({ row }) => <span className="block text-right tabular-nums">{row.original.seguimientos_pendientes}</span>,
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => null,
      cell: ({ row }) => {
        const r = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="icon-xs" variant="ghost" color="muted" aria-label={`Acciones de ${r.estudiante_nombre}`} />}>
              <DotsThreeVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => irFicha(r)}>Ver detalle</DropdownMenuItem>
              {access.puedeGestionar && esEditable(r.estado_codigo) && <DropdownMenuItem onClick={() => irFicha(r)}>Modificar</DropdownMenuItem>}
              {access.puedeGestionar && r.estado_codigo === "BORRADOR" && <DropdownMenuItem onClick={() => irFicha(r, "acta")}>Cargar acta</DropdownMenuItem>}
              {access.puedeGestionar && esEditable(r.estado_codigo) && <DropdownMenuItem onClick={() => irFicha(r, "cerrar")}>Cerrar</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
