import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { GrupoVotantes, OpcionesVotantes, Votante } from "@/features/comunicaciones/chat/api/types"

export function useOpcionesVotantesQuery(enabled: boolean) {
  return useQuery({
    queryKey: chatKeys.votantesOpciones,
    queryFn: async () => {
      const [row] = await evalCol.getRows<OpcionesVotantes>("/comunicaciones/votantes/opciones")
      return row ?? { grados: [], funcionarios: [] }
    },
    enabled,
    staleTime: Infinity,
  })
}

export function useVotantesQuery(grupo: GrupoVotantes | undefined, valor: string | undefined) {
  return useQuery({
    queryKey: chatKeys.votantes(grupo ?? "none", valor ?? "none"),
    queryFn: () =>
      evalCol.postRows<Votante>("/comunicaciones/votantes/query", { GRUPO: grupo, VALOR: valor }),
    enabled: Boolean(grupo && valor),
    staleTime: 5 * 60_000,
  })
}
