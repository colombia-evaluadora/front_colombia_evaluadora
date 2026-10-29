import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"
import type { CriterioUnidad } from "@/features/planeador/api/types/unidad-tematica"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

interface UpdateCriterioUnidadInput {
  unidadId: number
  criterioId: number
  criterio: Omit<CriterioUnidad, "id" | "puedeGestionar" | "autor">
}

/**
 * `PUT /planeador/unidades/criterios/:id` (sso V492.4,
 * `fn_unidad_criterio_actualizar`): PATCH parcial; `NIVELES` solo reescribe
 * los textos de los niveles que el criterio YA tiene (por
 * `fkTescalaValoracion`), no crea niveles nuevos. Gate: el docente puro solo
 * edita los criterios que creó (`fn_unidad_assert_criterio_propietario`,
 * 42501 con "solo su autor lo edita o elimina"); los directivos, todos.
 */
function updateCriterioUnidad({ criterioId, criterio }: UpdateCriterioUnidadInput): Promise<unknown> {
  const url = `/eval-col/planeador/unidades/criterios/${criterioId}`
  if (env.ENABLE_API_MOCKING) return api.put(url, criterio)
  return api.put(url, {
    DESCRIPCION: criterio.nombre,
    NIVELES: JSON.stringify(
      criterio.niveles
        .filter((nivel) => nivel.valoracionId != null)
        .map((nivel) => ({ fkTescalaValoracion: nivel.valoracionId, indicador: nivel.descripcion })),
    ),
  })
}

export function useUpdateCriterioUnidad({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof updateCriterioUnidad> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: updateCriterioUnidad,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: planeadorKeys.unidad.criterios(args[1].unidadId) })
      onSuccess?.(...args)
    },
  })
}
