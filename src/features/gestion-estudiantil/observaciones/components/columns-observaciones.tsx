import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"

import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { ObservacionRow } from "@/features/gestion-estudiantil/observaciones/api/types"
import { accionesObservacion } from "@/features/gestion-estudiantil/observaciones/api/ui-mappings"
import type { DialogoObservacion } from "@/features/gestion-estudiantil/observaciones/components/dialogos/use-dialogos-observaciones"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { ACCIONES_OBSERVACION, MenuAccionesObservacion } from "@/features/gestion-estudiantil/observaciones/components/menu-acciones-observacion"

interface ColumnasOpciones {
  onAccion: (observacion: ObservacionRow, accion: DialogoObservacion) => void
}

const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  // Encabezado plano: el backend no tiene parámetro de orden (siempre la más reciente primero), así que
  // no se ofrece el menú con flechas. «Columnas visibles» sigue ocultándolas.
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/**
 * Columnas del listado (G.7.LIS.1): Fecha · Grado/Grupo · Dirigida a · Título · Registrado por. El Estado
 * (Anulada) va como etiqueta junto a «Dirigida a», solo cuando aplica. Período de Evaluación queda
 * disponible y oculto por defecto.
 */
export function buildColumnsObservaciones({ onAccion }: ColumnasOpciones): ColumnDef<ObservacionRow>[] {
  return [
    {
      ...columna("fecha", "Fecha"),
      accessorKey: "fecha",
      cell: ({ row }) => formatFecha(row.original.fecha),
    },
    { ...columna("grado_grupo", "Grado/Grupo"), accessorKey: "grado_grupo" },
    {
      ...columna("dirigida_a", "Dirigida a"),
      accessorKey: "dirigida_a",
      cell: ({ row }) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          {/* G.7.LIS.1: «Todo el grupo» en cursiva; el nombre del estudiante, en redonda. */}
          <span className={row.original.fk_tmatricula == null ? "italic" : undefined}>{row.original.dirigida_a}</span>
          {row.original.anulada && (
            <Badge variant="soft" color="muted">
              <span>Anulada</span>
            </Badge>
          )}
        </span>
      ),
    },
    {
      ...columna("titulo", "Título"),
      accessorKey: "titulo",
      cell: ({ row }) => row.original.titulo || "—",
    },
    { ...columna("periodo", "Período de Evaluación"), accessorKey: "periodo_nombre" },
    {
      ...columna("registrado_por", "Registrado por"),
      accessorKey: "registrado_por_nombre",
      cell: ({ row }) => abreviarPersona(row.original.registrado_por_nombre) || "—",
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_OBSERVACION),
      cell: ({ row }) => (
        <MenuAccionesObservacion
          descripcion={`${row.original.titulo ?? "sin título"} de ${row.original.dirigida_a}`}
          acciones={accionesObservacion(row.original)}
          onAccion={(accion) => onAccion(row.original, accion)}
        />
      ),
    },
  ]
}
