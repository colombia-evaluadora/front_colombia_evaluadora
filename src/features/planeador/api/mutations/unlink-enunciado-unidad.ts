import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { unidadReferenteQueryKey } from "@/features/planeador/api/query/use-unidad-referente-query"

interface UnlinkEnunciadoInput {
  unidadId: number
  /** `pkTunidadEnunciado` — el pk de la RELACIÓN unidad↔enunciado, no el
   *  del enunciado (ver `UnidadReferenteEnunciado.pkRelacion`). */
  pkRelacion: number
}

// `PATCH`, no `DELETE` — mismo motor que el resto de soft-deletes del
// Planeador (confirmado real, colección Postman
// `planeador-flujo-unidad-actividad`, nota del paso 5).
function unlinkEnunciadoUnidad({ pkRelacion }: UnlinkEnunciadoInput): Promise<void> {
  return api.patch(`/eval-col/planeador/unidades/enunciados/${pkRelacion}`)
}

interface UseUnlinkEnunciadoUnidadOptions {
  mutationConfig?: MutationConfig<typeof unlinkEnunciadoUnidad>
}

/**
 * Desvincula un enunciado (nivel 1) que la unidad ya tenía relacionado —
 * se usa cuando el docente lo saca del picker de "Derechos Básicos de
 * Aprendizaje" al editar la unidad (`planeador-editar-unidad-page.tsx`).
 * No hay endpoint confirmado para AGREGAR uno nuevo a una unidad YA
 * creada (solo al crearla, `POST /unidades` con `ENUNCIADOS: [ids]`), así
 * que ese caso queda fuera de alcance por ahora.
 */
export function useUnlinkEnunciadoUnidad({ mutationConfig }: UseUnlinkEnunciadoUnidadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: unlinkEnunciadoUnidad,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: unidadReferenteQueryKey(variables.unidadId) })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}
