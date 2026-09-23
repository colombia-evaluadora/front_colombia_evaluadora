import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"
import {
  unidadDetalleQueryKey,
  unidadesQueryKey,
} from "@/features/planeador/api/query/use-unidades-query"
import { resolveCalculoDefinitivaId } from "@/features/planeador/api/query/use-calculo-definitiva-catalog"
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

/**
 * `PUT /planeador/unidades/:id` (confirmado real) — pese al verbo, el
 * backend lo trata como PATCH parcial: campo ausente preserva el valor
 * actual. Por eso `FK_TGRADO`/`FK_TASIGNATURA` solo se mandan si el
 * docente re-eligió grado/asignatura en este form (`gradoId`/`asignaturaId`
 * resueltos) — si no los tocó, se omiten y el backend conserva lo que la
 * unidad ya tenía, en vez de mandar un id viejo/adivinado.
 */
async function updateUnidad({ unidadId, data }: UpdateUnidadInput): Promise<UpdateUnidadResponse> {
  if (env.ENABLE_API_MOCKING) {
    return api.put(`/eval-col/planeador/unidades/${unidadId}`, data)
  }
  const body: Record<string, unknown> = {
    NOMBRE: data.nombre,
    DESCRIPCION: data.descripcion,
    OBJETIVOS: data.objetivos,
    CONTENIDOS: data.contenidos,
    FK_TLV_CALCULO_DEFINITIVA: await resolveCalculoDefinitivaId(data.metodoCalculo),
  }
  if (data.gradoId != null) body.FK_TGRADO = data.gradoId
  if (data.asignaturaId != null) body.FK_TASIGNATURA = data.asignaturaId
  // NO se manda `FK_TLV_INSTRUMENTO_EVALUACION`: desde el backend real (sso
  // V488) esa columna de `TUNIDAD` ya no existe — el instrumento de la
  // unidad se deriva de sus actividades vinculadas (solo lectura, ver
  // `UnidadDetallePanel`). `PUT /planeador/unidades/:id` descarta ese campo
  // en silencio si se lo manda; se dejó de intentar por completo.
  return api.put(`/eval-col/planeador/unidades/${unidadId}`, body)
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
