import { useMutation, useQueryClient } from "@tanstack/react-query"
import { writeConfig, type WriteRequest } from "@/lib/offline/outbox/write-request"

import { api } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"
import { resolveCalculoDefinitivaId } from "@/features/planeador/api/query/catalogos-lista-valor"
import { contenidosABody, type UnidadInfoGeneral } from "@/features/planeador/api/mutations/update-unidad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

/**
 * El autor sale del token. `FK_REFERENTE_CURRICULAR` no se manda: se deriva del grado
 * y uno que no aplique al nivel da 409.
 */
interface CreateUnidadResponse {
  /** PK real: `CrearUnidadPopover` la selecciona de una en el `<Select>`. */
  id: number
}

export async function createUnidad(data: UnidadInfoGeneral, req?: WriteRequest): Promise<CreateUnidadResponse> {
  if (env.ENABLE_API_MOCKING) {
    const created = await api.post<UnidadTematica>("/eval-col/planeador/unidades", data, writeConfig(req))
    return { id: created.id }
  }
  if (data.gradoId == null || data.asignaturaId == null) {
    throw new Error("Elegí un grado y una asignatura antes de guardar.")
  }
  const calculoDefinitivaId = await resolveCalculoDefinitivaId(data.metodoCalculo)
  const body: Record<string, unknown> = {
    NOMBRE: data.nombre,
    DESCRIPCION: data.descripcion,
    FK_TASIGNATURA: data.asignaturaId,
    FK_TGRADO: data.gradoId,
    FK_TLV_CALCULO_DEFINITIVA: calculoDefinitivaId,
    OBJETIVOS: data.objetivos,
    ...contenidosABody(data.contenidos),
  }
  // Sin `FK_TLV_INSTRUMENTO_EVALUACION`: el instrumento se deriva de las actividades.
  if (data.enunciadosDba.length > 0) {
    body.ENUNCIADOS = data.enunciadosDba.map((enunciado) => enunciado.id)
  }
  // El motor devuelve `{rows:[{<función>: pk}]}`: el pk es el único campo de la fila.
  const row = await evalCol.postRow<Record<string, number>>("/planeador/unidades", body, writeConfig(req))
  const [pk] = Object.values(row)
  if (pk == null) throw new Error("La creación de la unidad no devolvió su identificador.")
  return { id: pk }
}

interface UseCreateUnidadOptions {
  mutationConfig?: MutationConfig<typeof createUnidad>
}

export function useCreateUnidad({ mutationConfig }: UseCreateUnidadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: (data: UnidadInfoGeneral) => createUnidad(data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: planeadorKeys.unidades.all })
      // `unidades.tabs` vive fuera de `unidades.all`; sin alcance es prefijo de todas.
      queryClient.invalidateQueries({ queryKey: planeadorKeys.unidades.tabs() })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
