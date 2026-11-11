import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"

import { abreviarPersona, formatFechaHora12 } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { CitacionRow } from "@/features/gestion-estudiantil/citaciones/api/types"
import {
  accionesCitacion,
  COLOR_ESTADO_CITACION,
  origenEnlace,
  type PermisosCitaciones,
} from "@/features/gestion-estudiantil/citaciones/api/ui-mappings"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { ACCIONES_CITACION, MenuAccionesCitacion, type AccionCitacion } from "@/features/gestion-estudiantil/citaciones/components/menu-acciones-citacion"

interface ColumnasOpciones {
  permisos: PermisosCitaciones & { puedeVer: boolean }
  onAccion: (citacion: CitacionRow, accion: AccionCitacion) => void
}

/** Sede y Jornada siguen en «Columnas», pero arrancan ocultas (como en Procesos disciplinarios). */
export const COLUMNAS_CITACIONES_OCULTAS = { sede: false, jornada: false }

const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  // Encabezado plano: el orden lo fija el backend, así que no se ofrece el menú con flechas de ordenar
  // (`DataTableColumnHeader` lo pinta mientras la columna sea ocultable). «Columnas» sigue ocultándolas.
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/** Columnas del listado de citaciones (G.3.CIT.1). */
export function buildColumnsCitaciones({ permisos, onAccion }: ColumnasOpciones): ColumnDef<CitacionRow>[] {
  return [
    {
      ...columna("fecha", "Fecha y hora"),
      accessorKey: "fecha_programada",
      // Por programar no tiene fecha: la fila lo dice con un guion, no con un campo vacío.
      cell: ({ row }) => formatFechaHora12(row.original.fecha_programada) || "—",
    },
    {
      ...columna("estudiante", "Estudiante"),
      accessorKey: "estudiante_nombre",
      cell: ({ row }) => (
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">{row.original.estudiante_nombre}</span>
          <span className="text-xs text-muted-foreground">{row.original.grado_grupo}</span>
        </span>
      ),
    },
    {
      ...columna("acudiente", "Acudiente"),
      accessorKey: "acudiente_nombre",
      cell: ({ row }) => row.original.acudiente_nombre ?? "—",
    },
    { ...columna("motivo", "Motivo"), accessorKey: "motivo_nombre" },
    {
      ...columna("origen", "Origen"),
      accessorKey: "origen_tipo",
      cell: ({ row }) => {
        const origen = origenEnlace(row.original.origen_tipo, row.original.origen_id)
        if (!origen) return "—"
        return origen.href ? (
          <Link to={origen.href} className="text-primary hover:underline">
            {origen.texto}
          </Link>
        ) : (
          origen.texto
        )
      },
    },
    {
      ...columna("atiende", "Quién atiende"),
      accessorKey: "atiende_nombre",
      cell: ({ row }) => abreviarPersona(row.original.atiende_nombre) || "—",
    },
    { ...columna("sede", "Sede"), accessorKey: "sede_nombre" },
    { ...columna("jornada", "Jornada"), accessorKey: "jornada_nombre" },
    {
      ...columna("estado", "Estado"),
      accessorKey: "estado_nombre",
      cell: ({ row }) => (
        <Badge variant="soft" color={COLOR_ESTADO_CITACION[row.original.estado_valor] ?? "muted"}>
          <span>{row.original.estado_nombre}</span>
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_CITACION),
      cell: ({ row }) => (
        <MenuAccionesCitacion
          estudiante={row.original.estudiante_nombre}
          acciones={accionesCitacion(row.original, permisos)}
          puedeVer={permisos.puedeVer}
          onAccion={(accion) => onAccion(row.original, accion)}
        />
      ),
    },
  ]
}
