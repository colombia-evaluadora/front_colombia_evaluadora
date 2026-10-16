import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { ArchivoCompartido } from "@/features/comunicaciones/chat/api/types"
import { CHAT_FUNCIONES } from "@/features/comunicaciones/chat/lib/funciones-disponibles"

// Los filtros se aplican en front: la lista por institución es corta.
// TODO: pasarlos al body cuando exista el endpoint real.
async function fetchArchivos() {
  return evalCol.getRows<ArchivoCompartido>("/comunicaciones/archivos")
}

export function useArchivosQuery() {
  return useQuery({ queryKey: chatKeys.archivos, queryFn: fetchArchivos, enabled: CHAT_FUNCIONES.archivos })
}
