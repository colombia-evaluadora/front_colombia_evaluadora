import { useQueries } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { useGradosCatalogQuery } from "@/features/establishment/academic-period/api/query/use-grados-catalog"

interface GrupoRow {
  id: number
  codigo: string
}
interface GruposRawResponse {
  rows: GrupoRow[]
}

async function fetchGruposDeGrado(gradeId: number): Promise<GrupoRow[]> {
  const raw: GruposRawResponse = await api.post(`/eval-col/grados/${gradeId}/grupos/query`, {
    PAGE_INDEX: "0",
    PAGE_SIZE: "100",
  })
  return raw.rows ?? []
}

export interface GradoGrupoCombo {
  /** `"6°/01"` — lo que guarda el `<Select>` combinado de "Grado / Grupo". */
  value: string
  /** `nombre` del catálogo GRADOS (ej. `"6°"`) — así queda `Actividad.grado`. */
  gradoNombre: string
  /** `codigo` del grupo (ej. `"01"`) — así queda `Actividad.grupo`. */
  grupoCodigo: string
}

/**
 * Combos "grado/grupo" aplanados de TODOS los grados del catálogo. El
 * `<Select>` de "Grado / Grupo" es uno solo (no dos selects encadenados,
 * ver `AsignaturaGradoSection`), así que necesita ver de una todas las
 * combinaciones posibles. `useQueries` porque la cantidad de queries (una
 * por grado, para traer sus grupos) es dinámica — no se puede llamar
 * `useGradeGroupsQuery` adentro de un loop.
 */
export function useGradoGrupoCombos() {
  const { data: grados = [], isPending: isPendingGrados } = useGradosCatalogQuery()

  const gruposQueries = useQueries({
    queries: grados.map((grado) => ({
      queryKey: ["planeador-grado-grupo-combo", grado.id],
      queryFn: () => fetchGruposDeGrado(grado.id),
      staleTime: Infinity,
    })),
  })

  const isPending = isPendingGrados || gruposQueries.some((q) => q.isPending)

  const combos: GradoGrupoCombo[] = grados.flatMap((grado, index) => {
    const grupos = gruposQueries[index]?.data ?? []
    return grupos.map((grupo) => ({
      value: `${grado.nombre}/${grupo.codigo}`,
      gradoNombre: grado.nombre,
      grupoCodigo: grupo.codigo,
    }))
  })

  return { combos, isPending }
}
