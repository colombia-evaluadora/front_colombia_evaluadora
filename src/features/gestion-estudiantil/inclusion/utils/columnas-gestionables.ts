import type { ColumnDef } from "@tanstack/react-table"

/** El gestor de columnas solo lista las que tienen accessor y las nombra con `meta.label`. */
export function columnasGestionables<T>(columns: ColumnDef<T>[]): ColumnDef<T>[] {
  return columns.map((c) => {
    if (typeof c.header !== "string") return c
    const conDato = "accessorKey" in c || "accessorFn" in c
    return {
      ...c,
      ...(conDato ? {} : { accessorFn: () => null }),
      meta: { label: c.header, ...c.meta },
    } as ColumnDef<T>
  })
}
