import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { abreviarPersona } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { ReconocimientoRow } from "@/features/gestion-estudiantil/reconocimientos/api/types"
import { accionesReconocimiento } from "@/features/gestion-estudiantil/reconocimientos/api/ui-mappings"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { ACCIONES_RECONOCIMIENTO, MenuAccionesReconocimiento, type AccionReconocimiento } from "@/features/gestion-estudiantil/reconocimientos/components/menu-acciones-reconocimiento"

interface ColumnasOpciones {
  onAccion: (reconocimiento: ReconocimientoRow, accion: AccionReconocimiento) => void
}

const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  // Encabezado plano: el backend no tiene parámetro de orden, así que no se ofrece el menú con flechas
  // (`DataTableColumnHeader` lo pinta mientras la columna sea ocultable). «Columnas» sigue ocultándolas.
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/** Columnas del listado de reconocimientos (G.6.LIS.1). Sede y Jornada no vienen en la fila. */
export function buildColumnsReconocimientos({ onAccion }: ColumnasOpciones): ColumnDef<ReconocimientoRow>[] {
  return [
    {
      ...columna("fecha", "Fecha"),
      accessorKey: "fecha",
      cell: ({ row }) => formatFecha(row.original.fecha),
    },
    {
      ...columna("estudiante", "Estudiante"),
      accessorKey: "estudiante_nombre",
      cell: ({ row }) => (
        <span className="flex flex-wrap items-center gap-2">
          <span>{row.original.estudiante_nombre}</span>
          {row.original.anulado && (
            <Badge variant="soft" color="muted">
              <span>Anulado</span>
            </Badge>
          )}
        </span>
      ),
    },
    { ...columna("grado_grupo", "Grado/Grupo"), accessorKey: "grado_grupo" },
    { ...columna("tipo", "Tipo"), accessorKey: "tipo_nombre" },
    { ...columna("motivo", "Motivo"), accessorKey: "motivo" },
    {
      ...columna("otorgado_por", "Otorgado por"),
      accessorKey: "otorgado_por",
      cell: ({ row }) => abreviarPersona(row.original.otorgado_por) || "—",
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_RECONOCIMIENTO),
      cell: ({ row }) => (
        <MenuAccionesReconocimiento
          estudiante={row.original.estudiante_nombre}
          acciones={accionesReconocimiento(row.original)}
          onAccion={(accion) => onAccion(row.original, accion)}
        />
      ),
    },
  ]
}
