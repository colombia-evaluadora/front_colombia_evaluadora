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
 * materiales de apoyo de la actividad — un array vacío los deja todos.
 * `MATERIALES` viaja como STRING serializado (regla de los campos `JSONB`
 * del motor), no como array anidado.
 *
 * Un recurso de tipo "Archivo" trae el binario real (el form lo guarda como
 * blob URL en `Recurso.url`, ver `RecursoForm`): el request completo va como
 * `multipart/form-data` en vez de JSON — cada archivo se adjunta bajo
 * `archivo_<i>`, y su entrada en `MATERIALES` lleva `archivoIndex: i` en vez
 * de `url` para que el backend lo correlacione con la parte del multipart.
 */
export interface UpdateMaterialesResult {
  /** Recursos "Archivo" sin un blob URL válido (no debería pasar desde el
   *  form normal) — para que el caller avise en vez de fallar en silencio. */
  recursosOmitidos: string[]
}

async function updateMaterialesActividad({
  actividadId,
  recursos,
}: UpdateMaterialesInput): Promise<UpdateMaterialesResult> {
  const formData = new FormData()
  const materiales: Record<string, unknown>[] = []
  const recursosOmitidos: string[] = []
  let archivoIndex = 0

  for (const recurso of recursos) {
    const tipoRecurso = await resolveTipoRecursoId(recurso.tipo)

    if (recurso.tipo !== "Archivo") {
      materiales.push({ tipoRecurso, url: recurso.url, descripcion: recurso.descripcion })
      continue
    }

    if (!recurso.url) {
      recursosOmitidos.push(recurso.titulo || recurso.fuente || "Recurso sin nombre")
      continue
    }

    // El input de tipo "file" guarda el binario como blob URL (ver
    // `RecursoForm`) — se recupera el `Blob` real acá, al armar el request,
    // en vez de cargar `File` en el estado del form (no serializa a JSON, lo
    // que rompería el borrador de `actividad-form-draft.ts`).
    const index = archivoIndex++
    const blob = await fetch(recurso.url).then((r) => r.blob())
    formData.append(`archivo_${index}`, blob, recurso.fuente || `archivo_${index}`)
    materiales.push({ tipoRecurso, descripcion: recurso.descripcion, archivoIndex: index })
  }

  formData.append("MATERIALES", JSON.stringify(materiales))

  await api.put(`/eval-col/planeador/actividades/${actividadId}/materiales`, formData)
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
