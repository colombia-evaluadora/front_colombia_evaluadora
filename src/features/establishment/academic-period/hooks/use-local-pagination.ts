import { useState } from "react"

// Paginación en el front para las tablas de las pestañas: la consulta trae
// todas las filas (los avisos y resúmenes las necesitan, p. ej. la suma de
// porcentajes del plan de estudio) y la tabla muestra una página a la vez.
export function useLocalPagination<T>(rows: T[], initialPageSize = 10) {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const pageCount = Math.max(Math.ceil(rows.length / pageSize), 1)
  // Si se borra la última fila de la última página, vuelve a la anterior.
  const current = Math.min(pageIndex, pageCount - 1)

  const changePageSize = (size: number) => {
    setPageSize(size)
    setPageIndex(0)
  }

  return {
    pageRows: rows.slice(current * pageSize, (current + 1) * pageSize),
    table: {
      pageCount,
      pageIndex: current,
      pageSize,
      goToPage: setPageIndex,
      setPageSize: changePageSize,
    },
    pagination: {
      pageIndex: current,
      pageCount,
      canPrev: current > 0,
      canNext: current < pageCount - 1,
      totalCount: rows.length,
      pageSize,
      onPageChange: setPageIndex,
      onPageSizeChange: changePageSize,
    },
  }
}
