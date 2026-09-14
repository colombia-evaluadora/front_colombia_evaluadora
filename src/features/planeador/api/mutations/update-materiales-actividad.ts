import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { actividadDetalleQueryKey } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { resolveTipoRecursoId } from "@/features/planeador/api/query/use-tipo-recurso-catalog"
import type { Recurso } from "@/features/planeador/api/types/actividad"

interface UpdateMaterialesInput {
  actividadId: number
  recursos: Recurso[]
}

/**
 * `PUT /planeador/actividades/:id/materiales` (confirmado real, colección
 * Postman `planeador-guia-completa`, 4.7): reemplazo COMPLETO de los
 * materiales de apoyo de la actividad — un array vacío los deja todos. Cada
 * elemento manda EXACTAMENTE uno de `url`/`fkTarchivo`; `MATERIALES` viaja
 * como STRING serializado (regla de los campos `JSONB` del motor), no como
 * array anidado.
 *
 * Un recurso de tipo "Archivo" NO se puede mandar todavía: el backend real
 * exige `fkTarchivo` (el PK de un archivo ya subido a través del picker de
 * repositorio, carpeta 1.7), pero el form de la actividad no tiene flujo de
 * carga — su input `type="file"` no sube nada, solo guarda el nombre como
 * texto en `Recurso.url`. Mandar ese nombre como si fuera `url` sería un
 * dato inválido para el backend, así que estos recursos se DEJAN AFUERA del
 * body (ver `recursosOmitidos` en el resultado) en vez de arriesgar el 400
 * de toda la lista o guardar basura.
 */
export interface UpdateMaterialesResult {
  /** Nombres de los recursos "Archivo" que no se pudieron guardar — para que
   *  el caller avise al docente en vez de fallar en silencio. */
  recursosOmitidos: string[]
}

async function updateMaterialesActividad({
  actividadId,
  recursos,
}: UpdateMaterialesInput): Promise<UpdateMaterialesResult> {
  const enviables = recursos.filter((recurso) => recurso.tipo !== "Archivo")
  const recursosOmitidos = recursos
    .filter((recurso) => recurso.tipo === "Archivo")
    .map((recurso) => recurso.titulo || recurso.url || "Recurso sin nombre")

  const materiales = await Promise.all(
    enviables.map(async (recurso) => ({
      tipoRecurso: await resolveTipoRecursoId(recurso.tipo),
      url: recurso.url,
      descripcion: recurso.descripcion,
    })),
  )

  await api.put(`/eval-col/planeador/actividades/${actividadId}/materiales`, {
    MATERIALES: JSON.stringify(materiales),
  })
  return { recursosOmitidos }
}

interface UseUpdateMaterialesActividadOptions {
  mutationConfig?: MutationConfig<typeof updateMaterialesActividad>
}

/**
 * Guarda los "Materiales de apoyo" (bloque de Recursos) de una actividad ya
 * creada. Se llama aparte del `PUT`/`POST` principal de la actividad —
 * `MATERIALES` no viaja en ese body, tiene su propia ruta de reemplazo
 * completo (ver el comentario de arriba).
 */
export function useUpdateMaterialesActividad({
  mutationConfig,
}: UseUpdateMaterialesActividadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: updateMaterialesActividad,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: actividadDetalleQueryKey(variables.actividadId) })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}
