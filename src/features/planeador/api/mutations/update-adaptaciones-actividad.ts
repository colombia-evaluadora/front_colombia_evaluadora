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
 * `formatoAdaptacion` — confirmado real contra el mensaje de error del
 * backend ("Con usaVersionModificada = 'S' se debe indicar formatoAdaptacion
 * (ARCHIVO, ENLACE o BIBLIOTECA)"): faltaba del todo en este body, así que
 * CUALQUIER adaptación con `versionModificada` distinto de "no" tumbaba el
 * PUT entero (las demás adaptaciones de la lista incluidas, por ser
 * reemplazo completo). Se deriva 1:1 de `Adaptacion.versionModificada`
 * ("archivo"/"enlace"/"biblioteca" → "ARCHIVO"/"ENLACE"/"BIBLIOTECA"),
 * mismo valor que ya decide qué campo de `versionModificadaRef` llenar en
 * el form (ver el comentario de `Adaptacion` en `types/actividad.ts`).
 *
 * El body confirmado trae `tipoAdaptacion`/`descripcion`/
 * `usaVersionModificada`/`formatoAdaptacion`/`aplicaA` — NO hay campo
 * confirmado para la referencia de la versión modificada
 * (`Adaptacion.versionModificadaRef`: el archivo/enlace/plantilla en sí,
 * distinto del FORMATO que ya se manda) ni para los estudiantes puntuales
 * cuando `aplicaA === "Estudiantes específicos"` (`Adaptacion.estudiantesIds`)
 * — los dos se guardan en el form pero no viajan todavía a este PUT; se
 * necesita una captura real que confirme esos campos antes de mandarlos.
 */
function formatoAdaptacionDe(versionModificada: Adaptacion["versionModificada"]): string | undefined {
  if (versionModificada === "archivo") return "ARCHIVO"
  if (versionModificada === "enlace") return "ENLACE"
  if (versionModificada === "biblioteca") return "BIBLIOTECA"
  return undefined
}

async function updateAdaptacionesActividad({ actividadId, adaptaciones }: UpdateAdaptacionesInput): Promise<void> {
  const cuerpo = await Promise.all(
    adaptaciones.map(async (adaptacion) => {
      const usaVersionModificada = adaptacion.versionModificada && adaptacion.versionModificada !== "no" ? "S" : "N"
      return {
        tipoAdaptacion: await resolveTipoAdaptacionId(adaptacion.tipo),
        descripcion: adaptacion.descripcion,
        usaVersionModificada,
        // Solo se manda si aplica — con "N" el backend lo rechaza igual que
        // con "S" y sin él, así que omitirlo (en vez de `null`) es el único
        // valor válido en ese caso.
        ...(usaVersionModificada === "S"
          ? { formatoAdaptacion: formatoAdaptacionDe(adaptacion.versionModificada) }
          : {}),
        aplicaA: await resolveAplicaAId(adaptacion.aplicaA),
      }
    }),
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
