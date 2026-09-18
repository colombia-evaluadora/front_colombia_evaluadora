import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { CriterioUnidad } from "@/features/planeador/api/types/unidad-tematica"

/**
 * `GET /planeador/unidades/:id/criterios` (real, confirmado en
 * `docs/planeador/flujo-rubrica-criterios-unidad.md` del repo del SSO,
 * endpoint 5 / `fn_unidad_criterio_listar`) — la tabla de "Rúbricas" del
 * panel de unidad NO puede leer `unidad.criterios` del detalle
 * (`GET /planeador/unidades/:id`): ese endpoint no devuelve criterios en el
 * backend real, siempre viene vacío. Mismo patrón ya resuelto para
 * actividades en `use-unidad-actividades-query.ts`.
 */
interface UnidadCriterioNivelRow {
  pk: number
  orden: number
  fkTescalaValoracion: number
  valoracion: string
  indicador: string
  recomendacion?: string | null
  tarea?: string | null
}

interface UnidadCriterioRow {
  pk_tcriterio_unidad: number
  orden: number
  descripcion: string
  publico?: "S" | "N"
  codigo?: string | null
  descriptor_prom?: "S" | "N"
  niveles: UnidadCriterioNivelRow[]
  active?: boolean
}

function toCriterioUnidad(row: UnidadCriterioRow): CriterioUnidad {
  return {
    id: row.pk_tcriterio_unidad,
    nombre: row.descripcion,
    niveles: row.niveles
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((nivel) => ({
        nombre: nivel.valoracion,
        descripcion: nivel.indicador,
        valoracionId: nivel.fkTescalaValoracion,
      })),
  }
}

async function fetchUnidadCriterios(unidadId: number): Promise<CriterioUnidad[]> {
  const rows = await evalCol.getRows<UnidadCriterioRow>(
    `/planeador/unidades/${unidadId}/criterios`,
  )
  return rows.map(toCriterioUnidad)
}

export const unidadCriteriosQueryKey = (unidadId: number) =>
  ["planeador", "unidad", unidadId, "criterios"] as const

export function useUnidadCriteriosQuery(unidadId: number | undefined) {
  return useQuery({
    queryKey:
      unidadId != null
        ? unidadCriteriosQueryKey(unidadId)
        : (["planeador", "unidad", "none", "criterios"] as const),
    queryFn: () => fetchUnidadCriterios(unidadId!),
    enabled: unidadId != null,
    staleTime: 1000 * 30,
  })
}
