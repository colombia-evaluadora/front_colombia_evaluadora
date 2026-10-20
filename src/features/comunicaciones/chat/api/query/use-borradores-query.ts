import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Borrador } from "@/features/comunicaciones/chat/api/types"
import { CHAT_FUNCIONES } from "@/features/comunicaciones/chat/lib/funciones-disponibles"

async function fetchBorradores() {
  return evalCol.getRows<Borrador>("/comunicaciones/borradores")
}

export function useBorradoresQuery() {
  return useQuery({
    queryKey: chatKeys.borradores,
    queryFn: fetchBorradores,
    enabled: CHAT_FUNCIONES.borradores,
    // Los borradores programados se gestionan en línea: sin red no hacen
    // falta para leer el chat guardado.
    meta: { offlineOptional: true },
  })
}
