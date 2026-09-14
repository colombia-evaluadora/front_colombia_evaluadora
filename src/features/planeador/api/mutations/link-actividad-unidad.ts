import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

interface LinkActividadInput {
  unidadId: number
  actividadId: number
  /** `null` no toca el peso actual (semántica real de `PONDERACION` NULL) —
   *  siempre se manda un número acá porque el modal de vincular no ofrece
   *  "dejarlo como estaba" para una actividad que recién se vincula. Se
   *  ignora por completo cuando `omitirPonderacion` (ver abajo). */
  ponderacion: number
  /** `true` cuando la unidad NO calcula por "Ponderado" — es decir,
   *  "Promedio simple" o "Suma de puntos" — ahí el backend rechaza que se
   *  mande `PONDERACION` (ver el comentario de `createUnidadActividadesColumns`
   *  en `columns-unidad-actividades.tsx`: con esos dos métodos el % no se
   *  edita a mano). */
  omitirPonderacion?: boolean
  /** Obligatorio en `true` solo si la actividad YA estaba vinculada a OTRA
   *  unidad — vincular una huérfana no lo necesita. El modal actual (ver
   *  `DialogAgregarActividad`) solo ofrece huérfanas, así que siempre manda
   *  `false`; queda como parámetro para cuando ofrezca mover de unidad. */
  permitirMoverDeUnidad?: boolean
}

interface LinkActividadResponse {
  status?: "ok" | "error"
  message?: string
}

function linkActividadUnidad({
  unidadId,
  actividadId,
  ponderacion,
  omitirPonderacion,
  permitirMoverDeUnidad,
}: LinkActividadInput): Promise<LinkActividadResponse> {
  const body: Record<string, unknown> = {
    PERMITIR_MOVER_DE_UNIDAD: permitirMoverDeUnidad ?? false,
  }
  if (!omitirPonderacion) body.PONDERACION = ponderacion
  return api.put(`/eval-col/planeador/unidades/${unidadId}/actividades/${actividadId}`, body)
}

interface UseLinkActividadUnidadOptions {
  mutationConfig?: MutationConfig<typeof linkActividadUnidad>
}

/**
 * Vincula una actividad ya existente a una unidad, con su peso dentro de
 * ella. Invalida TODO lo que cuelga de `["planeador", "unidad", unidadId]`
 * (prefix match de React Query) — detalle, actividades vinculadas y
 * disponibles — para que la tabla de "Actividades" y el "% disponible" del
 * diálogo reflejen el nuevo vínculo apenas se confirma.
 */
export function useLinkActividadUnidad({ mutationConfig }: UseLinkActividadUnidadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: linkActividadUnidad,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: ["planeador", "unidad", variables.unidadId] })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}
