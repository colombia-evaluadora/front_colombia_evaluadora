import { useQuery } from "@tanstack/react-query"

import { fetchSedeOptions } from "@/features/establishment/academic-period/api/query/use-sede-options"
import { fetchEstablishmentsOptions } from "@/features/establishment/institution/api/query/use-establishments-options"
import type { MatriculaCampusCatalog } from "@/features/coverage/api/types/matricula"

/** Los nombres de los colegios, solo para rotular; sin ellos la sede sale
 *  con su nombre, que sigue sirviendo porque el valor es el id. */
async function nombresDeColegios(): Promise<Map<number, string>> {
  try {
    const { rows } = await fetchEstablishmentsOptions()
    return new Map(rows.map((colegio) => [colegio.id, colegio.name]))
  } catch {
    return new Map()
  }
}

async function fetchMatriculaCampuses(): Promise<MatriculaCampusCatalog> {
  const sedes = await fetchSedeOptions()
  const variosColegios = new Set(sedes.map((sede) => sede.fk_establecimiento)).size > 1
  const colegios = variosColegios ? await nombresDeColegios() : new Map<number, string>()

  return {
    campuses: [...new Set(sedes.map((sede) => sede.nombre))],
    sedes: sedes.map((sede) => {
      const colegio = colegios.get(sede.fk_establecimiento)
      return {
        id: String(sede.pk_sede),
        nombre: sede.nombre,
        label: colegio ? `${sede.nombre} · ${colegio}` : sede.nombre,
        establecimientoId: sede.fk_establecimiento,
      }
    }),
  }
}

export function useMatriculaCampusesQuery() {
  return useQuery({
    queryKey: ["matricula", "campuses"],
    queryFn: fetchMatriculaCampuses,
    staleTime: 0,
  })
}
