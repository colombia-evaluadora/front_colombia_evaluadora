import { useMutation, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { OpcionesSeleccion, ResolucionSeleccion } from "@/features/comunicaciones/chat/api/types"
import type { CuerpoSeleccion } from "@/features/comunicaciones/chat/lib/seleccion-grupal"

const VACIAS: OpcionesSeleccion = { grados: [], grupos: [], roles: [] }

// Grados, grupos académicos y cargos de los establecimientos de quien crea el grupo.
export function useOpcionesSeleccionQuery(enabled: boolean) {
  return useQuery({
    queryKey: chatKeys.seleccionOpciones,
    queryFn: async () => {
      const [row] = await evalCol.getRows<OpcionesSeleccion>("/comunicaciones/grupos/seleccion/opciones")
      return { ...VACIAS, ...row }
    },
    enabled,
    staleTime: 5 * 60_000,
  })
}

/**
 * Vista previa del alta (lectura por POST, a demanda al pulsar "Agregar"): quiénes entrarían y
 * cuántas ya estaban. Con `conversacionId` descuenta a los miembros actuales de ese grupo.
 */
export function useResolverSeleccion() {
  return useMutation({
    mutationFn: async ({ cuerpo, conversacionId }: { cuerpo: CuerpoSeleccion; conversacionId?: number }) => {
      const [row] = await evalCol.postRows<ResolucionSeleccion>("/comunicaciones/grupos/seleccion/resolver", {
        ...cuerpo,
        ...(conversacionId ? { FK_CONVERSACION: conversacionId } : {}),
      })
      return row ?? { personas: [], total: 0, yaEnElGrupo: 0 }
    },
  })
}
