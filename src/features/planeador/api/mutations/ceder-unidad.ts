import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

interface CederUnidadInput {
  unidadId: number
  nuevoFuncionarioId: number
}

/**
 * Regla 27: ceder una unidad a OTRO docente, para resolver el 409 que tira
 * `fn_unidad_validar_eliminable` cuando se intenta borrar una unidad con
 * actividades/criterios de otros docentes vinculados ("Ceda la unidad a uno
 * de ellos en lugar de eliminarla"). Es el mismo
 * `PUT /planeador/unidades/:id` parcial que edita la unidad (campo ausente
 * preserva lo existente — ver `update-unidad.ts`), mandando solo
 * `FK_TFUNCIONARIO`: `fn_unidad_validar_cesion` exige que el nuevo dueño ya
 * tenga actividades/criterios propios en la unidad o dicte su
 * grado+asignatura, y tira 22023 (`isConflictError`/`getErrorMessage` lo
 * muestran tal cual) si no corresponde. El nuevo dueño sale de
 * `GET /planeador/unidades/:id/colegas` (`useUnidadColegasQuery`), no de un
 * buscador general. El mock modela el mismo contrato (`mocks/db/unidades-tematicas.ts`).
 */
async function cederUnidad({ unidadId, nuevoFuncionarioId }: CederUnidadInput): Promise<void> {
  await api.put(`/eval-col/planeador/unidades/${unidadId}`, { FK_TFUNCIONARIO: nuevoFuncionarioId })
}

interface UseCederUnidadOptions {
  mutationConfig?: MutationConfig<typeof cederUnidad>
}

export function useCederUnidad({ mutationConfig }: UseCederUnidadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: cederUnidad,
    ...restConfig,
    onSuccess: (data, variables, ...rest) => {
      // El dueño cambia: el listado (`es_propia`), el detalle, las pestañas y
      // los listados de actividades (`actividades-*`, que muestran al dueño de
      // la unidad vinculada) dejan de valer. Quien cedió deja de ver las
      // acciones de administrador en cuanto el listado vuelve con
      // `es_propia = N`.
      queryClient.invalidateQueries({ queryKey: planeadorKeys.unidades.all })
      queryClient.invalidateQueries({ queryKey: planeadorKeys.unidad.detalle(variables.unidadId) })
      queryClient.invalidateQueries({ queryKey: planeadorKeys.unidades.tabs() })
      queryClient.invalidateQueries({ queryKey: planeadorKeys.actividades.all })
      queryClient.invalidateQueries({ queryKey: planeadorKeys.actividades.tabs() })
      onSuccess?.(data, variables, ...rest)
    },
  })
}
