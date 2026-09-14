import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { actividadDetalleQueryKey } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { resolveTipoAdaptacionId } from "@/features/planeador/api/query/use-tipo-adaptacion-catalog"
import { resolveAplicaAId } from "@/features/planeador/api/query/use-aplica-a-catalog"
import type { Adaptacion } from "@/features/planeador/api/types/actividad"

interface UpdateAdaptacionesInput {
  actividadId: number
  adaptaciones: Adaptacion[]
}

/**
 * `PUT /planeador/actividades/:id/adaptaciones` (confirmado real, colección
 * Postman `planeador-guia-completa`, 4.8): reemplazo COMPLETO de las
 * adaptaciones curriculares — un array vacío las quita todas. `ADAPTACIONES`
 * viaja como STRING serializado (regla de los `JSONB` del motor).
 *
 * El body confirmado solo trae `tipoAdaptacion`/`descripcion`/
 * `usaVersionModificada`/`aplicaA` — NO hay campo confirmado para la
 * referencia de la versión modificada (`Adaptacion.versionModificadaRef`:
 * archivo, enlace o plantilla de biblioteca) ni para los estudiantes
 * puntuales cuando `aplicaA === "Estudiantes específicos"`
 * (`Adaptacion.estudiantesIds`) — ambos se guardan en el form pero no
 * viajan todavía a este PUT; se necesita una captura real que confirme esos
 * campos antes de mandarlos (ver el aviso a la actividad de dónde salió
 * este comentario).
 */
async function updateAdaptacionesActividad({ actividadId, adaptaciones }: UpdateAdaptacionesInput): Promise<void> {
  const cuerpo = await Promise.all(
    adaptaciones.map(async (adaptacion) => ({
      tipoAdaptacion: await resolveTipoAdaptacionId(adaptacion.tipo),
      descripcion: adaptacion.descripcion,
      usaVersionModificada: adaptacion.versionModificada && adaptacion.versionModificada !== "no" ? "S" : "N",
      aplicaA: await resolveAplicaAId(adaptacion.aplicaA),
    })),
  )
  await api.put(`/eval-col/planeador/actividades/${actividadId}/adaptaciones`, {
    ADAPTACIONES: JSON.stringify(cuerpo),
  })
}

interface UseUpdateAdaptacionesActividadOptions {
  mutationConfig?: MutationConfig<typeof updateAdaptacionesActividad>
}

/**
 * Guarda las "Adaptaciones curriculares" de una actividad ya creada. Igual
 * que `useUpdateMaterialesActividad`: ruta aparte, reemplazo completo, se
 * llama solo cuando la lista de verdad cambió (ver el caller).
 */
export function useUpdateAdaptacionesActividad({
  mutationConfig,
}: UseUpdateAdaptacionesActividadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: updateAdaptacionesActividad,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: actividadDetalleQueryKey(variables.actividadId) })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}
