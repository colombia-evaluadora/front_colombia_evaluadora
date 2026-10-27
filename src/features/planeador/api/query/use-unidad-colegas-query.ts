import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

/** Fila de `GET /planeador/unidades/:id/colegas` (`fn_unidad_colegas_listar`). */
export interface UnidadColegaRow {
  /** NULL si el autor no es funcionario: bloquea el borrado pero no se le puede ceder. */
  fk_tfuncionario: number | null
  nombre: string | null
  actividades: number | null
  criterios: number | null
}

export interface UnidadColega {
  funcionarioId: number | null
  nombre: string
  /** Actividades activas suyas vinculadas a la unidad. */
  actividades: number
  /** Criterios propios activos en la rúbrica de la unidad. */
  criterios: number
}

export function toUnidadColega(row: UnidadColegaRow): UnidadColega {
  return {
    funcionarioId: row.fk_tfuncionario ?? null,
    nombre: row.nombre?.trim() || "Docente sin nombre",
    actividades: Number(row.actividades ?? 0),
    criterios: Number(row.criterios ?? 0),
  }
}

export async function fetchUnidadColegas(unidadId: number): Promise<UnidadColega[]> {
  const rows = await evalCol.getRows<UnidadColegaRow>(`/planeador/unidades/${unidadId}/colegas`)
  return rows.map(toUnidadColega)
}

/**
 * Regla 27: docentes (sin el dueño) que usan la unidad — actividades propias
 * vinculadas o criterios propios en su rúbrica. Es la misma lógica con la que
 * el backend bloquea el borrado (`fn_unidad_colegas_uso`), así que la lista
 * coincide con el 409. Mismo gate que eliminar: solo lo consulta el dueño, y
 * solo hace falta en el paso "ceder" (`enabled`). Sin caché: se pide al
 * llegar al paso, porque es la foto de quién usa la unidad ahora.
 */
export function useUnidadColegasQuery(unidadId: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: planeadorKeys.unidad.colegas(unidadId),
    queryFn: () => fetchUnidadColegas(unidadId),
    enabled: enabled && Boolean(unidadId),
    staleTime: 0,
  })
}
