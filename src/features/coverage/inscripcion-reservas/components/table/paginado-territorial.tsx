import type { ReactNode } from "react"

import { Pagination } from "@/components/pagination"
import { useTablePagination } from "@/hooks/use-table-pagination"

/** Las listas llegan completas: se filtran y paginan en el front. */
export function usePaginado<T>(filas: T[]) {
  const pagination = useTablePagination()
  const pageCount = Math.max(1, Math.ceil(filas.length / pagination.pageSize))
  // Al filtrar puede quedar una página que ya no existe: se muestra la última.
  const pageIndex = Math.min(pagination.pageIndex, pageCount - 1)
  const desde = pageIndex * pagination.pageSize
  return {
    pagination: { ...pagination, pageIndex },
    pageCount,
    pagina: filas.slice(desde, desde + pagination.pageSize),
    total: filas.length,
  }
}

/** Lista paginada en el back: solo llega la página; el total sale de la respuesta. */
export function usePaginadoServidor(total: number) {
  const pagination = useTablePagination()
  return {
    pagination,
    pageCount: Math.max(1, Math.ceil(total / pagination.pageSize)),
    total,
  }
}

/** Paginación bajo la tabla, con el menú de columnas visibles como en el resto de la app. */
export function Paginas({
  p,
  viewOptions,
}: {
  p: ReturnType<typeof usePaginadoServidor>
  viewOptions?: ReactNode
}) {
  return (
    <Pagination
      viewOptions={viewOptions}
      pageIndex={p.pagination.pageIndex}
      pageCount={p.pageCount}
      canPrev={p.pagination.pageIndex > 0}
      canNext={p.pagination.pageIndex < p.pageCount - 1}
      onPageChange={p.pagination.goToPage}
      totalCount={p.total}
      pageSize={p.pagination.pageSize}
      onPageSizeChange={p.pagination.setPageSize}
    />
  )
}
