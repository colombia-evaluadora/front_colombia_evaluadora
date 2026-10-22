import { useMutation, useQueryClient } from "@tanstack/react-query"
import { isOutboxFileRef, resolveUploadFile, writeConfig, type WriteRequest } from "@/lib/offline/outbox/write-request"

import { api } from "@/lib/api-client"
import { postMultipart } from "@/lib/files"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"
import type { MutationConfig } from "@/lib/react-query"
import { resolveTipoRecursoId } from "@/features/planeador/api/query/catalogos-lista-valor"
import type { Recurso } from "@/features/planeador/api/types/actividad"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

export interface UpdateMaterialesInput {
  actividadId: number
  recursos: Recurso[]
}

// El PUT reemplaza todo; cada material lleva `url` o `fkTarchivo` (exactamente uno).
// Los archivos se suben antes, uno por request: el PUT no recibe multipart.
export interface UpdateMaterialesResult {
  /** Recursos "Archivo" sin blob URL: el caller avisa en vez de fallar en silencio. */
  recursosOmitidos: string[]
}

interface ArchivoSubidoRow {
  fk_tarchivo: number
}

/** Sube un archivo; el `File` no va al estado del form porque no serializa al borrador. */
async function subirArchivoMaterial(
  actividadId: number,
  recurso: Recurso,
  req?: WriteRequest,
): Promise<number> {
  const nombre = recurso.fuente || "archivo"
  const file = await resolveUploadFile(recurso.url, nombre, req)
  // `postMultipart` antepone `/files` para que lo intercepte file-service.
  const respuesta = await postMultipart<RowsEnvelope<ArchivoSubidoRow> | ArchivoSubidoRow>(
    `/eval-col/planeador/actividades/${actividadId}/materiales/archivo`,
    {},
    { ARCHIVO: file },
    { background: req?.background },
  )
  return unwrapRow<ArchivoSubidoRow>(respuesta).fk_tarchivo
}

export async function updateMaterialesActividad(
  { actividadId, recursos }: UpdateMaterialesInput,
  req?: WriteRequest,
): Promise<UpdateMaterialesResult> {
  const materiales: Record<string, unknown>[] = []
  const recursosOmitidos: string[] = []

  for (const recurso of recursos) {
    const tipoRecurso = await resolveTipoRecursoId(recurso.tipo)

    if (recurso.tipo !== "Archivo") {
      materiales.push({ tipoRecurso, url: recurso.url, descripcion: recurso.descripcion })
      continue
    }

    // Archivo ya guardado: se reenvía por id o el PUT (reemplazo total) lo borra.
    if (recurso.archivoId !== undefined && !recurso.url.startsWith("blob:") && !isOutboxFileRef(recurso.url)) {
      materiales.push({ tipoRecurso, fkTarchivo: recurso.archivoId, descripcion: recurso.descripcion })
      continue
    }

    // Sin blob ni id el backend rechazaría el PUT entero: se omite y se informa.
    if (!recurso.url) {
      recursosOmitidos.push(recurso.titulo || recurso.fuente || "Recurso sin nombre")
      continue
    }

    // Encolado: se sube una vez por clave aunque el paso se reintente.
    const fkTarchivo =
      isOutboxFileRef(recurso.url) && req?.files
        ? await req.files.memo(recurso.url, () => subirArchivoMaterial(actividadId, recurso, req))
        : await subirArchivoMaterial(actividadId, recurso, req)
    materiales.push({ tipoRecurso, fkTarchivo, descripcion: recurso.descripcion })
  }

  // JSONB: viaja como string serializado.
  await api.put(`/eval-col/planeador/actividades/${actividadId}/materiales`, {
    MATERIALES: JSON.stringify(materiales),
  }, writeConfig(req))
  return { recursosOmitidos }
}

interface UseUpdateMaterialesActividadOptions {
  mutationConfig?: MutationConfig<typeof updateMaterialesActividad>
}

/** Materiales de una actividad ya creada: va aparte del PUT/POST principal. */
export function useUpdateMaterialesActividad({
  mutationConfig,
}: UseUpdateMaterialesActividadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: (input: UpdateMaterialesInput) => updateMaterialesActividad(input),
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: planeadorKeys.actividad.detalle(variables.actividadId) })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}
