import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"

// Contenido HTML de un documento editable de Archivos.
export async function fetchDocumento(archivoId: number) {
  const [row] = await evalCol.getRows<{ contenidoHtml: string }>(
    `/comunicaciones/archivos/${archivoId}/contenido`,
  )
  return row?.contenidoHtml ?? ""
}

export function useDocumentoQuery(archivoId: number | undefined) {
  return useQuery({
    queryKey: chatKeys.documento(archivoId ?? "none"),
    queryFn: () => fetchDocumento(archivoId as number),
    enabled: Boolean(archivoId),
    staleTime: 0,
  })
}
