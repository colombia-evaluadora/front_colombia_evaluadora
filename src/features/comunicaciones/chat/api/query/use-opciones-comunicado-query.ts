import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { OpcionesComunicado } from "@/features/comunicaciones/chat/api/types"

export interface FiltrosComunicado {
  establecimiento?: string
  sede?: string
  jornada?: string
}

const VACIAS: OpcionesComunicado = {
  establecimientos: [],
  sedes: [],
  jornadas: [],
  grados: [],
  grupos: [],
  roles: [],
  audiencias: [],
  todos: false,
}

/**
 * Opciones del selector de destinatarios de un comunicado: solo lo que está en el alcance de quien
 * publica (comms-service lo calcula y además rechaza con 403 lo que quede fuera), acotado en cascada
 * por establecimiento → sede → jornada.
 */
export function useOpcionesComunicadoQuery(enabled: boolean, filtros: FiltrosComunicado) {
  return useQuery({
    queryKey: chatKeys.comunicadoOpciones(filtros),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filtros.establecimiento) params.set("establecimiento", filtros.establecimiento)
      if (filtros.sede) params.set("sede", filtros.sede)
      if (filtros.jornada) params.set("jornada", filtros.jornada)
      const qs = params.toString()
      const [row] = await evalCol.getRows<OpcionesComunicado>(
        `/comunicaciones/comunicados/destinos/opciones${qs ? `?${qs}` : ""}`,
      )
      return { ...VACIAS, ...row }
    },
    enabled,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  })
}
