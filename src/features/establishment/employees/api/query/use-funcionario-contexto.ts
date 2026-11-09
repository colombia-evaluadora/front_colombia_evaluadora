import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import { catalogoMeta } from "@/lib/offline/query-meta"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"
import {
  LISTA_VALOR_STALE_TIME,
  type SelectCategoryRow,
} from "@/features/establishment/academic-period/api/query/fetch-select-category"

interface ContextoRow {
  establecimiento_id: number
  nombre: string
  oficial: boolean
}

/** El establecimiento desde el que se agrega un funcionario: si es Oficial lleva información complementaria (Regla 90). */
export function useFuncionarioContextoQuery(establishmentId: number | null) {
  return useQuery({
    queryKey: [...employeeKeys.all, "contexto", establishmentId] as const,
    queryFn: async () => {
      const row = await evalCol.getRow<ContextoRow>(
        `/establecimientos/funcionarios/establecimiento?establecimiento=${establishmentId}`,
      )
      return { id: row.establecimiento_id, name: row.nombre, isOfficial: row.oficial === true }
    },
    enabled: establishmentId != null,
    staleTime: LISTA_VALOR_STALE_TIME,
  })
}

/**
 * Grados escalafón del estatuto docente elegido: Grado escalafón tiene como lista padre
 * Estatuto docente (V579.1). Sin estatuto no se ofrece ninguno.
 */
export function useGradosEscalafonQuery(statuteId: number | null) {
  return useQuery({
    meta: catalogoMeta(),
    queryKey: ["select-category", "ESCALAFON", "padre", statuteId] as const,
    queryFn: async () => {
      const raw = (await api.get(`/eval-col/select/ESCALAFON`, { params: { padre: statuteId } })) as unknown as {
        rows?: SelectCategoryRow[]
      }
      return raw.rows ?? []
    },
    enabled: statuteId != null,
    staleTime: LISTA_VALOR_STALE_TIME,
  })
}
