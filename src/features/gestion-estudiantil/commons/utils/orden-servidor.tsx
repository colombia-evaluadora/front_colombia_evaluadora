import type { Column, ColumnDef, SortingState } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"

/** Clave de ORDEN por id de columna: solo las columnas con clave se ordenan en el servidor. */
export type MapaOrden = Record<string, string>

export interface OrdenServidor {
  ORDEN?: string
  DIR?: "asc" | "desc"
}

/**
 * `BODY.ORDEN`/`BODY.DIR` a partir del orden de la tabla; sin columna con clave, `undefined` (orden por
 * defecto). `undefined` y no `{}` para que la query key coincida con la que precarga el modo sin conexión.
 */
export function ordenServidor(sorting: SortingState, mapa: MapaOrden): OrdenServidor | undefined {
  const s = sorting[0]
  const orden = s ? mapa[s.id] : undefined
  return s && orden ? { ORDEN: orden, DIR: s.desc ? "desc" : "asc" } : undefined
}

/** Solo las columnas con clave llevan encabezado ordenable; el resto queda sin orden. */
export function conOrdenServidor<T>(columns: ColumnDef<T>[], mapa: MapaOrden): ColumnDef<T>[] {
  return columns.map((c) => {
    const id = c.id ?? ""
    if (!(id in mapa)) return { ...c, enableSorting: false } as ColumnDef<T>
    const titulo = c.header
    return {
      ...c,
      enableSorting: true,
      header:
        typeof titulo === "string"
          ? ({ column }: { column: Column<T, unknown> }) => <DataTableColumnHeader column={column} title={titulo} />
          : titulo,
    } as ColumnDef<T>
  })
}
