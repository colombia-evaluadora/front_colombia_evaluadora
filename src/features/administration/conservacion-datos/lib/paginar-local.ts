import type { SortingState } from "@tanstack/react-table"

import { toPageCount } from "@/lib/pagination"

/** Orden y página en el front para las listas cortas (políticas, ampliaciones, vencidos). */
export function paginarLocal<T>(
  filas: T[],
  { sorting, pageIndex, pageSize }: { sorting: SortingState; pageIndex: number; pageSize: number },
  valor: (fila: T, columna: string) => string | number,
) {
  const [orden] = sorting
  const ordenadas = orden
    ? [...filas].sort((a, b) => {
        const r = String(valor(a, orden.id)).localeCompare(String(valor(b, orden.id)), "es", { numeric: true })
        return orden.desc ? -r : r
      })
    : filas
  const pageCount = toPageCount(ordenadas.length, pageSize)
  // Si la lista se achica, la página no queda fuera de rango.
  const index = Math.min(pageIndex, Math.max(pageCount - 1, 0))
  return {
    pagina: ordenadas.slice(index * pageSize, (index + 1) * pageSize),
    pageCount,
    pageIndex: index,
  }
}
