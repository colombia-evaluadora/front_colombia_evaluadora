import { useState } from "react"

import { Pagination } from "@/components/pagination"

/**
 * Paginación en front: los endpoints de procesos (lista, postulaciones, padrón) devuelven todo de una
 * vez y no reciben PAGE_INDEX. Se pagina sobre lo ya filtrado; al cambiar el filtro se vuelve a la
 * primera página con `reiniciar()`.
 */
export function usePaginaLocal<T>(items: T[], tamanoInicial = 10) {
  const [pagina, setPagina] = useState(0)
  const [tamano, setTamano] = useState(tamanoInicial)
  const total = items.length
  const paginas = Math.max(1, Math.ceil(total / tamano))
  // Si el filtro dejó menos filas, la página actual podría quedar fuera de rango.
  const actual = Math.min(pagina, paginas - 1)
  const filas = items.slice(actual * tamano, (actual + 1) * tamano)
  const paginacion = (
    <Pagination
      pageIndex={actual}
      pageCount={paginas}
      canPrev={actual > 0}
      canNext={actual < paginas - 1}
      totalCount={total}
      pageSize={tamano}
      onPageChange={setPagina}
      onPageSizeChange={(n) => {
        setTamano(n)
        setPagina(0)
      }}
    />
  )
  return { filas, paginacion, reiniciar: () => setPagina(0) }
}
