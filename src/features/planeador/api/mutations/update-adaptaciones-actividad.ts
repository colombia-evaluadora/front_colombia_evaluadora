import { useMutation, useQueryClient } from "@tanstack/react-query"
import { isOutboxFileRef, resolveUploadFile, writeConfig, type WriteRequest } from "@/lib/offline/outbox/write-request"

import { api } from "@/lib/api-client"
import { postMultipart } from "@/lib/files"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"
import type { MutationConfig } from "@/lib/react-query"
import { resolveAplicaAId, resolveFormatoAdaptacionId, resolveTipoAdaptacionId } from "@/features/planeador/api/query/catalogos-lista-valor"
import type { Adaptacion } from "@/features/planeador/api/types/actividad"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

export interface UpdateAdaptacionesInput {
  actividadId: number
  adaptaciones: Adaptacion[]
}

/**
 * Reemplazo completo (array vacío las quita todas). `ADAPTACIONES` viaja como string (JSONB del motor);
 * `formatoAdaptacion` como id numérico (el backend castea a BIGINT).
 */
/** El nombre lleva la extensión real: el backend infiere el `Content-Type` por ella, no por el multipart. */
async function subirArchivoAdaptacion(
  actividadId: number,
  archivo: { blobUrl: string; nombre: string },
  req?: WriteRequest,
): Promise<number> {
  const nombre = archivo.nombre || "plantilla"
  const file = await resolveUploadFile(archivo.blobUrl, nombre, req)
  const respuesta = await postMultipart<RowsEnvelope<{ fk_tarchivo: number }> | { fk_tarchivo: number }>(
    `/eval-col/planeador/actividades/${actividadId}/adaptaciones/archivo`,
    {},
    { ARCHIVO: file },
    { background: req?.background },
  )
  return unwrapRow<{ fk_tarchivo: number }>(respuesta).fk_tarchivo
}

export async function updateAdaptacionesActividad(
  { actividadId, adaptaciones }: UpdateAdaptacionesInput,
  req?: WriteRequest,
): Promise<void> {
  const cuerpo = await Promise.all(
    adaptaciones.map(async (adaptacion) => {
      const usaVersionModificada = adaptacion.versionModificada && adaptacion.versionModificada !== "no" ? "S" : "N"
      const [tipoAdaptacion, aplicaA, formatoAdaptacion] = await Promise.all([
        resolveTipoAdaptacionId(adaptacion.tipo),
        resolveAplicaAId(adaptacion.aplicaA),
        usaVersionModificada === "S" ? resolveFormatoAdaptacionId(adaptacion.versionModificada) : undefined,
      ])
      const base = {
        tipoAdaptacion,
        // Solo "Otro" lo exige. La clave es `especificacionTipo`: el validador rechaza claves no declaradas.
        ...(adaptacion.tipo === "Otro" ? { especificacionTipo: adaptacion.especificacionTipo } : {}),
        descripcion: adaptacion.descripcion,
        usaVersionModificada,
        aplicaA,
        // Regla 47: con "A todo el grupo" el backend rechaza `estudiantes`.
        ...(adaptacion.aplicaA === "Estudiantes específicos" ? { estudiantes: adaptacion.estudiantesIds } : {}),
      }
      // Con "N" el backend rechaza formato/archivo/url: hay que omitirlos, no mandar `null`.
      if (usaVersionModificada !== "S") return base

      if (adaptacion.versionModificada === "enlace") {
        return {
          ...base,
          formatoAdaptacion,
          url: adaptacion.versionModificadaRef,
          nombrePlantilla: adaptacion.nombrePlantilla,
        }
      }
      // Biblioteca: recurso ya existente (archivo o URL), no se sube nada; conserva su `nombrePlantilla`.
      if (adaptacion.versionModificada === "biblioteca") {
        if (adaptacion.archivoId !== undefined) {
          return { ...base, formatoAdaptacion, fkTarchivo: adaptacion.archivoId }
        }
        if (adaptacion.versionModificadaRef) {
          return { ...base, formatoAdaptacion, url: adaptacion.versionModificadaRef }
        }
        throw new Error(
          "Elegí una plantilla de la biblioteca institucional para la adaptación marcada como \"Biblioteca\".",
        )
      }
      // Hasta 3. Los ya guardados se reenvían por `fkTarchivo` (el PUT reemplaza todo); los nuevos se suben.
      if (adaptacion.archivos.length === 0) {
        throw new Error("Adjuntá al menos un archivo de plantilla para la adaptación marcada como \"Archivo\".")
      }
      const archivos = await Promise.all(
        adaptacion.archivos.map((archivo) =>
          archivo.fkTarchivo !== undefined
            ? archivo.fkTarchivo
            : isOutboxFileRef(archivo.blobUrl) && req?.files
              ? req.files.memo(archivo.blobUrl, () =>
                  subirArchivoAdaptacion(actividadId, { blobUrl: archivo.blobUrl ?? "", nombre: archivo.nombre }, req),
                )
              : subirArchivoAdaptacion(actividadId, { blobUrl: archivo.blobUrl ?? "", nombre: archivo.nombre }, req),
        ),
      )
      return { ...base, formatoAdaptacion, archivos, nombrePlantilla: adaptacion.nombrePlantilla }
    }),
  )
  await api.put(`/eval-col/planeador/actividades/${actividadId}/adaptaciones`, {
    ADAPTACIONES: JSON.stringify(cuerpo),
  }, writeConfig(req))
}

interface UseUpdateAdaptacionesActividadOptions {
  mutationConfig?: MutationConfig<typeof updateAdaptacionesActividad>
}

/** Ruta aparte con reemplazo completo; el caller la llama solo si la lista cambió. */
export function useUpdateAdaptacionesActividad({
  mutationConfig,
}: UseUpdateAdaptacionesActividadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: (input: UpdateAdaptacionesInput) => updateAdaptacionesActividad(input),
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: planeadorKeys.actividad.detalle(variables.actividadId) })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}
