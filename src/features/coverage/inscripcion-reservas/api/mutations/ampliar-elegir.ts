import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { resolverOpcion } from "@/features/coverage/inscripcion-reservas/api/mutations/editar-inscripcion"
import {
  INSCRIPCIONES_BASE,
  inscripcionesKeys,
} from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import { reservasCupoKeys } from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import type { OpcionCupoInput } from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"

/** Ampliar inscripción (Regla 27): una opción más, del mismo grado, al final del orden de preferencia. */
export function useAmpliarInscripcion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      grado,
      opcion,
    }: {
      id: string
      grado: string
      opcion: OpcionCupoInput
    }) => {
      const { periodo, grado: gradoId } = await resolverOpcion(opcion, grado)
      await evalCol.postRow(`${INSCRIPCIONES_BASE}/${id}/ampliar`, {
        PERIODO: periodo,
        GRADO: gradoId,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inscripcionesKeys.all }),
  })
}

/** Elegir opción / Quedarme con esta opción (Regla 38): las demás quedan Descartadas y liberan su cupo. */
export function useElegirOpcion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (opcionId: string) =>
      evalCol.postRow(`${INSCRIPCIONES_BASE}/opciones/${opcionId}/elegir`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inscripcionesKeys.all })
      queryClient.invalidateQueries({ queryKey: reservasCupoKeys.all })
    },
  })
}
