"use no memo"

import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { EyeIcon } from "@/components/ui/icons"
import { tiposAbreviados } from "@/features/comunicaciones/comunicados/lib/tipos-destinatario"
import type {
  ComunicadoTerritorial,
  EstadoTerritorial,
} from "@/features/comunicaciones/territorial/api/comunicados-territorial"
import { dirigidoA, tiposTerritorial } from "@/features/comunicaciones/territorial/lib/destinatarios"
import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"

export const ESTADOS_TERRITORIAL: Record<
  EstadoTerritorial,
  { etiqueta: string; color: "info" | "success" | "neutral" | "destructive" }
> = {
  PUBLICADO: { etiqueta: "Publicado", color: "success" },
  PROGRAMADO: { etiqueta: "Programado", color: "info" },
  VENCIDO: { etiqueta: "Vencido", color: "neutral" },
  ANULADO: { etiqueta: "Anulado", color: "destructive" },
}

export function EstadoTerritorialBadge({ estado }: { estado: EstadoTerritorial }) {
  const { etiqueta, color } = ESTADOS_TERRITORIAL[estado] ?? { etiqueta: estado, color: "neutral" }
  return (
    <Badge variant="soft" color={color}>
      {etiqueta}
    </Badge>
  )
}

/** Abreviados como en Publicados (M.1.LIS.1); sin tipo (grados o personas del formato anterior), el resumen. */
const textoTipos = (c: ComunicadoTerritorial) => {
  const tipos = tiposTerritorial(c)
  return tipos.length > 0 ? tiposAbreviados(tipos) : dirigidoA(c)
}

/**
 * Columnas de la consulta territorial (M.1.TER.1): las de Publicados más Establecimiento. Los ids son
 * los `sortBy` que entiende comms-service (fecha, establecimiento, titulo, publicadoPor,
 * destinatarios, estado). Única acción: Ver detalle (solo lectura).
 */
export function createTerritorialColumns({
  onVer,
}: {
  onVer: (c: ComunicadoTerritorial) => void
}): ColumnDef<ComunicadoTerritorial>[] {
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
      id: "establecimiento",
      accessorKey: "establecimiento",
      meta: { label: "Establecimiento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Establecimiento" />,
      cell: ({ row }) => (
        <span title={row.original.establecimiento} className="block max-w-56 truncate">
          {row.original.establecimiento || "—"}
        </span>
      ),
    },
    {
      id: "titulo",
      accessorKey: "titulo",
      meta: { label: "Título" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Título" />,
      cell: ({ row }) => (
        <span title={row.original.titulo} className="block max-w-72 truncate font-medium">
          {row.original.titulo}
        </span>
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
      accessorFn: (row) => textoTipos(row),
      enableSorting: false,
      meta: { label: "Tipos" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipos" />,
      cell: ({ row }) => (
        <span title={dirigidoA(row.original)} className="block max-w-56 truncate">
          {textoTipos(row.original)}
        </span>
      ),
    },
    {
      id: "destinatarios",
      accessorKey: "destinatarios",
      meta: { label: "Destinatarios", className: "text-center" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Destinatarios" className="justify-center" />
      ),
      cell: ({ row }) => (
        <span className="block text-center tabular-nums">
          {(row.original.destinatarios ?? 0).toLocaleString("es-CO")}
        </span>
      ),
    },
    {
      id: "estado",
      accessorKey: "estado",
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => <EstadoTerritorialBadge estado={row.original.estado} />,
    },
    {
      id: "actions",
      size: anchoAccionesFila(1),
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <AccionesFila
          etiqueta={`Opciones de ${row.original.titulo}`}
          acciones={[{ id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onVer(row.original) }]}
        />
      ),
    },
  ]
}
