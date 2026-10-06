import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Borrador } from "@/features/comunicaciones/chat/api/types"

async function fetchBorradores() {
  return evalCol.getRows<Borrador>("/comunicaciones/borradores")
}

export function useBorradoresQuery() {
  return useQuery({ queryKey: chatKeys.borradores, queryFn: fetchBorradores })
}
