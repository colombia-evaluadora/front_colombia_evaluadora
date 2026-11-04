import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { convivenciaKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"
import type { FuncionarioInvolucrable } from "@/features/gestion-estudiantil/convivencia/api/types"

export interface FuncionariosInvolucrablesParams {
  /** Modificar: el caso (gate de gestión; excluye a los ya involucrados). Manda sobre `matricula`. */
  casoId: number | null
  /** Alta: la primera matrícula del caso. */
  matricula: number | null
  /** pk del catálogo TIPO_INVOLUCRADO de la fila. */
  tipo: number | null
  search: string
  enabled?: boolean
}

const LIMITE = 50

/** `GET /convivencia/funcionarios`: funcionarios del establecimiento elegibles como otro involucrado. */
export function useFuncionariosInvolucrablesQuery({ casoId, matricula, tipo, search, enabled = true }: FuncionariosInvolucrablesParams) {
  const q = search.trim().slice(0, 100)
  return useQuery({
    queryKey: convivenciaKeys.funcionarios({ casoId, matricula, tipo, q }),
    queryFn: () => {
      const params = new URLSearchParams({ TIPO_INVOLUCRADO: String(tipo), LIMITE: String(LIMITE) })
      if (casoId != null) params.set("CASO", String(casoId))
      else params.set("MATRICULA", String(matricula))
      if (q) params.set("SEARCH", q)
      return evalCol.getRows<FuncionarioInvolucrable>(`/gestion-estudiantil/convivencia/funcionarios?${params}`)
    },
    enabled: enabled && tipo != null && (casoId != null || matricula != null),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}
