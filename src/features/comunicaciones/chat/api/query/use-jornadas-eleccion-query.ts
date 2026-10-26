import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"

export interface JornadaEleccion {
  id: number
  nombre: string
}

// "Jornada" de la elección: solo las jornadas configuradas en el establecimiento del usuario
// (las de los periodos académicos activos de sus sedes, `GET /comunicaciones/elecciones/jornadas`
// en comms-service). Antes se usaba el catálogo global JORNADA (`useJornadasQuery`), que ofrecía
// Nocturna, Fin de semana… aunque ninguna sede las tuviera. El backend valida contra esta misma
// lista al crear/editar.
export function useJornadasEleccionQuery() {
  return useQuery({
    queryKey: chatKeys.jornadasEleccion,
    queryFn: () => evalCol.getRows<JornadaEleccion>("/comunicaciones/elecciones/jornadas"),
    staleTime: 5 * 60_000,
  })
}
