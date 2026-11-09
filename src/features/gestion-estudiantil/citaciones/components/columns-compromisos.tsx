import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { paths } from "@/config/paths"

import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { CompromisoRow } from "@/features/gestion-estudiantil/citaciones/api/types"
import {
  accionesCompromiso,
  COLOR_ESTADO_COMPROMISO,
  type PermisosCitaciones,
} from "@/features/gestion-estudiantil/citaciones/api/ui-mappings"
import {
  MenuAccionesCompromiso,
  type AccionCompromiso,
} from "@/features/gestion-estudiantil/citaciones/components/menu-acciones-compromiso"

interface ColumnasOpciones {
  permisos: PermisosCitaciones & { puedeVer: boolean }
  onAccion: (compromiso: CompromisoRow, accion: AccionCompromiso) => void
}

/** Sede y Jornada siguen en «Columnas», pero arrancan ocultas. */
export const COLUMNAS_COMPROMISOS_OCULTAS = { sede: false, jornada: false }

const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  // Encabezado plano: el orden lo fija el backend (ver columns-citaciones).
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/** Columnas del listado de compromisos (G.3.CMP.1). */
export function buildColumnsCompromisos({ permisos, onAccion }: ColumnasOpciones): ColumnDef<CompromisoRow>[] {
  return [
    { ...columna("fecha", "Fecha"), accessorKey: "fecha", cell: ({ row }) => formatFecha(row.original.fecha) },
    {
      ...columna("estudiante", "Estudiante"),
      accessorKey: "estudiante_nombre",
      cell: ({ row }) => (
        <span className="flex flex-col gap-0.5">
          <Link
            to={paths.app.compromisoDetalle.getHref(row.original.id)}
            className="font-medium text-primary underline-offset-3 hover:underline"
          >
            {row.original.estudiante_nombre}
          </Link>
          <span className="text-xs text-muted-foreground">{row.original.grado_grupo}</span>
        </span>
      ),
    },
    { ...columna("tipo", "Tipo"), accessorKey: "tipo_nombre" },
    {
      ...columna("fecha_revision", "Fecha de revisión"),
      accessorKey: "fecha_revision",
      cell: ({ row }) => formatFecha(row.original.fecha_revision),
    },
    { ...columna("sede", "Sede"), accessorKey: "sede_nombre" },
    { ...columna("jornada", "Jornada"), accessorKey: "jornada_nombre" },
    {
      ...columna("estado", "Estado"),
      accessorKey: "estado_nombre",
      cell: ({ row }) => (
        <span className="flex items-center gap-3">
          <Badge variant="soft" color={COLOR_ESTADO_COMPROMISO[row.original.estado_valor] ?? "muted"}>
            <span>{row.original.estado_nombre}</span>
          </Badge>
          {/* El sistema deja «No aceptado» al vencer la revisión sin aceptación (Regla 26). */}
          {row.original.estado_valor === "INCUMPLIDO" && row.original.observacion_resultado && (
            <span className="text-muted-foreground">{row.original.observacion_resultado}</span>
          )}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: 48,
      cell: ({ row }) => (
        <MenuAccionesCompromiso
          estudiante={row.original.estudiante_nombre}
          acciones={accionesCompromiso(row.original, permisos)}
          onAccion={(accion) => onAccion(row.original, accion)}
        />
      ),
    },
  ]
}
