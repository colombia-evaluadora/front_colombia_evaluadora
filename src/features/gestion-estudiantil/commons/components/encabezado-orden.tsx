import type { Column } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"

import type { MapaOrden } from "@/features/gestion-estudiantil/commons/utils/orden-servidor"

/**
 * Parte común de una columna cuyo orden decide el servidor: solo las que están en `mapa` llevan
 * encabezado ordenable; las demás, encabezado plano y `enableSorting: false`. `meta.label` alimenta
 * «Columnas visibles».
 */
export function columnaOrden<T>(mapa: MapaOrden, id: string, titulo: string) {
  const ordenable = id in mapa
  return {
    id,
    enableSorting: ordenable,
    meta: { label: titulo },
    header: ordenable
      ? ({ column }: { column: Column<T, unknown> }) => <DataTableColumnHeader column={column} title={titulo} />
      : () => <div className="text-sm font-medium">{titulo}</div>,
  }
}
