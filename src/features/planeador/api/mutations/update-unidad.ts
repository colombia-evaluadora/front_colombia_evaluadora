import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import {
  unidadDetalleQueryKey,
  unidadesQueryKey,
} from "@/features/planeador/api/query/use-unidades-query"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

/** Todo menos `criterios`/`actividades`: esas listas se editan aparte, desde
 *  las pestañas Rúbricas/Actividades del panel. */
export type UnidadInfoGeneral = Omit<UnidadTematica, "id" | "criterios" | "actividades">

interface UpdateUnidadInput {
  unidadId: number
  data: UnidadInfoGeneral
}

interface UpdateUnidadResponse {
  status: "ok" | "error"
  message?: string
  unidad?: UnidadTematica
}

function updateUnidad({ unidadId, data }: UpdateUnidadInput): Promise<UpdateUnidadResponse> {
  return api.put(`/eval-col/planeador/unidades/${unidadId}`, data)
}

interface UseUpdateUnidadOptions {
  mutationConfig?: MutationConfig<typeof updateUnidad>
}

/**
 * Edita los campos de "Información general" de una unidad. Invalida el
 * detalle (el panel muestra los datos nuevos) y el listado (el nombre/área
 * de la card del rail también pueden haber cambiado).
 */
export function useUpdateUnidad({ mutationConfig }: UseUpdateUnidadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: updateUnidad,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: unidadDetalleQueryKey(variables.unidadId) })
      queryClient.invalidateQueries({ queryKey: unidadesQueryKey() })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}
