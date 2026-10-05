import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import {
  toValidacionCoordinador,
  type ValidacionCoordinadorRow,
} from "@/features/planeador/api/query/use-validacion-coordinador-query"

/** Tope de `TACTIVIDAD.OBSERVACION_VALIDACION_COORDINADOR` (sso V531.1). */
export const OBSERVACION_VALIDACION_MAX = 1000

export interface ResolverValidacionInput {
  actividadId: number
  decision: "APROBADA" | "DECLINADA"
  /** Obligatoria al declinar (el backend responde 400 sin ella). */
  observacion?: string
}

/**
 * `POST /planeador/actividades/:ID/validacion-coordinador` — el Coordinador
 * de la sede aprueba o declina la planeación. Reemplaza la decisión vigente.
 * 403 si no es Coordinador de la sede de la actividad o si la planeó él mismo.
 */
async function resolverValidacionCoordinador(input: ResolverValidacionInput) {
  const row = await evalCol.postRow<ValidacionCoordinadorRow>(
    `/planeador/actividades/${input.actividadId}/validacion-coordinador`,
    {
      DECISION: input.decision,
      OBSERVACION: input.observacion?.trim() || null,
    },
  )
  return toValidacionCoordinador(row)
}

export function useResolverValidacionCoordinador({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof resolverValidacionCoordinador> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: resolverValidacionCoordinador,
    ...rest,
    onSuccess: (...args) => {
      const [, input] = args
      // Prefijo del detalle: refresca también la validación de esa actividad.
      queryClient.invalidateQueries({ queryKey: planeadorKeys.actividad.detalle(input.actividadId) })
      onSuccess?.(...args)
    },
  })
}
