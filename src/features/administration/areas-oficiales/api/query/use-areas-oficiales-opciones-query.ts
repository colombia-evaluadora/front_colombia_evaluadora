import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { proveedorMeta } from "@/lib/offline/query-meta"

import { areaOficialKeys } from "@/features/administration/areas-oficiales/api/query-keys"
import type {
  AreaOficialOpcion,
  Resultado,
} from "@/features/administration/areas-oficiales/api/types/area-oficial"

async function fetchAreasOficialesOpciones(nivel?: number) {
  const qs = nivel != null ? `?NIVEL=${nivel}` : ""
  const [row] = await evalCol.getRows<Resultado<AreaOficialOpcion[]>>(
    `/catalogos/areas-oficiales${qs}`,
  )
  return row?.resultado ?? []
}

/**
 * Áreas oficiales ACTIVAS para los selectores (Referente). Las inactivas o
 * eliminadas no se ofrecen, pero lo que ya las tiene asociadas las conserva:
 * el selector debe seguir mostrando lo ya elegido aunque no venga acá.
 */
export function useAreasOficialesOpcionesQuery({ nivel }: { nivel?: number } = {}) {
  return useQuery({
    meta: proveedorMeta(),
    queryKey: areaOficialKeys.opciones(nivel ?? "todos"),
    queryFn: () => fetchAreasOficialesOpciones(nivel),
  })
}
