import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"
import { unidadesQueryKey } from "@/features/planeador/api/query/use-unidades-query"
import { resolveCalculoDefinitivaId } from "@/features/planeador/api/query/use-calculo-definitiva-catalog"
import type { UnidadInfoGeneral } from "@/features/planeador/api/mutations/update-unidad"

/**
 * `POST /planeador/unidades` (confirmado real, colección Postman
 * `planeador-guia-completa`). `FK_TFUNCIONARIO` YA NO se manda: el docente
 * autor se deriva del token — el campo sigue existiendo en el backend
 * (para que un coordinador cree la unidad a nombre de otro docente), pero
 * el Planeador no tiene ese caso de uso todavía.
 *
 * `FK_TGRADO`/`FK_TASIGNATURA` salen de lo que el docente eligió en el
 * `<Select>` (`useDocenteGradoAsignaturaQuery`, ver `form-unidad-info-general.tsx`)
 * — si por algún motivo quedaron sin resolver, se corta acá antes de mandar
 * un body a medias que el backend rechazaría igual.
 *
 * `FK_REFERENTE_CURRICULAR` es opcional y NO se manda: se deriva en la
 * práctica del grado → nivel de enseñanza (`GET .../referente`) — mandar
 * uno que no aplique al nivel del grado da 409 (confirmado, colección
 * Postman `planeador-flujo-unidad-actividad`, paso 4).
 *
 * `ENUNCIADOS` son los ids de los enunciados de DBA (nivel 1) que el
 * docente marcó (`useEnunciadosDbaQuery`/`ListaAgregableCajaSelect`, ver
 * `form-unidad-info-general.tsx`) — son justo los que la actividad podrá
 * usar después para ofrecer sus evidencias (nivel 2, hijas de estos).
 */
async function createUnidad(data: UnidadInfoGeneral): Promise<unknown> {
  if (env.ENABLE_API_MOCKING) {
    return api.post("/eval-col/planeador/unidades", data)
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
    CONTENIDOS: data.contenidos,
  }
  if (data.enunciadosDba.length > 0) {
    body.ENUNCIADOS = data.enunciadosDba.map((enunciado) => enunciado.id)
  }
  return api.post("/eval-col/planeador/unidades", body)
}

interface UseCreateUnidadOptions {
  mutationConfig?: MutationConfig<typeof createUnidad>
}

export function useCreateUnidad({ mutationConfig }: UseCreateUnidadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: createUnidad,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: unidadesQueryKey() })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
