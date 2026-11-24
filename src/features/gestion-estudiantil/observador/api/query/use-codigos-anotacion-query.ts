import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { observadorKeys } from "@/features/gestion-estudiantil/observador/api/query-keys"
import type { CodigoAnotacion } from "@/features/gestion-estudiantil/observador/api/types"

export const fetchCodigosAnotacion = (establecimientoId: number | null) =>
  evalCol.postRows<CodigoAnotacion>("/gestion-estudiantil/catalogo-anotaciones/selector", {
    FK_ESTABLECIMIENTO: establecimientoId,
  })

/** `POST /gestion-estudiantil/catalogo-anotaciones/selector`: solo los códigos habilitados del colegio. */
export function useCodigosAnotacionQuery(establecimientoId: number | null) {
  return useQuery({
    queryKey: observadorKeys.codigos(establecimientoId ?? "none"),
    queryFn: () => fetchCodigosAnotacion(establecimientoId),
    enabled: establecimientoId != null,
    staleTime: 1000 * 60 * 5,
  })
}
