import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { citacionesKeys } from "@/features/gestion-estudiantil/citaciones/api/query-keys"
import type { FuncionarioInvolucrable } from "@/features/gestion-estudiantil/convivencia/api/types"

const LIMITE = 50

/**
 * Candidatos a «Quién atiende»: el mismo `GET /convivencia/funcionarios` del selector de Otros involucrados
 * (funcionarios del establecimiento del grupo de la matrícula). `TIPO_INVOLUCRADO` es opcional en el back,
 * así que aquí no se manda y la lista no se recorta por rol. Sin matrícula no hay alcance: queda deshabilitado.
 */
export function useAtiendenQuery(matricula: number | null, search: string) {
  const q = search.trim().slice(0, 100)
  return useQuery({
    queryKey: [...citacionesKeys.all, "atienden", matricula, q] as const,
    queryFn: () => {
      const params = new URLSearchParams({ MATRICULA: String(matricula), LIMITE: String(LIMITE) })
      if (q) params.set("SEARCH", q)
      return evalCol.getRows<FuncionarioInvolucrable>(`/gestion-estudiantil/convivencia/funcionarios?${params}`)
    },
    enabled: matricula != null,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}
