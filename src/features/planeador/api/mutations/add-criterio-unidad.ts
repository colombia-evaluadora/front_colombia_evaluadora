import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"
import { unidadDetalleQueryKey } from "@/features/planeador/api/query/use-unidades-query"
import type { CriterioUnidad } from "@/features/planeador/api/types/unidad-tematica"

interface AddCriterioInput {
  unidadId: number
  criterio: Omit<CriterioUnidad, "id">
}

interface AddCriterioResponse {
  status: "ok" | "error"
  message?: string
  criterio?: CriterioUnidad
}

/**
 * `POST /planeador/unidades/:id/criterios` (confirmado real) — `NIVELES`
 * exige EXACTAMENTE un elemento por cada valoración activa de la escala de
 * la unidad, cada uno con el `pk_tescala_valoracion` real
 * (`DialogAgregarCriterio` ya arma `criterio.niveles[].valoracionId` desde
 * `useUnidadValoracionesQuery`, no adivinado). `CODIGO` no tiene campo
 * propio en este form todavía — se omite (el backend lo trata como
 * opcional); `PUBLICO`/`DESCRIPTOR_PROM` quedan en un default razonable
 * ("visible", "no promedia como descriptor") hasta que el form los
 * exponga.
 */
function addCriterioUnidad({ unidadId, criterio }: AddCriterioInput): Promise<AddCriterioResponse> {
  if (env.ENABLE_API_MOCKING) {
    return api.post(`/eval-col/planeador/unidades/${unidadId}/criterios`, criterio)
  }
  return api.post(`/eval-col/planeador/unidades/${unidadId}/criterios`, {
    DESCRIPCION: criterio.nombre,
    PUBLICO: "S",
    DESCRIPTOR_PROM: "N",
    NIVELES: JSON.stringify(
      criterio.niveles.map((nivel) => ({
        fkTescalaValoracion: nivel.valoracionId,
        indicador: nivel.descripcion,
      })),
    ),
  })
}

interface UseAddCriterioUnidadOptions {
  mutationConfig?: MutationConfig<typeof addCriterioUnidad>
}

/**
 * Agrega un criterio a la rúbrica de una unidad. Invalida el detalle de esa
 * unidad —no el listado, que no muestra criterios— para que la tabla de
 * "Rúbricas" del panel refleje el nuevo criterio apenas se cierra el diálogo.
 */
export function useAddCriterioUnidad({ mutationConfig }: UseAddCriterioUnidadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: addCriterioUnidad,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: unidadDetalleQueryKey(variables.unidadId) })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}
