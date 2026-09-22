import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { postMultipart } from "@/lib/files"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"
import type { MutationConfig } from "@/lib/react-query"
import { actividadDetalleQueryKey } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { resolveTipoAdaptacionId } from "@/features/planeador/api/query/use-tipo-adaptacion-catalog"
import { resolveFormatoAdaptacionId } from "@/features/planeador/api/query/use-formato-adaptacion-catalog"
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
 * `formatoAdaptacion` viaja como el id NUMÉRICO del catálogo
 * `FORMATO_ADAPTACION` (confirmado real contra el mensaje de error del
 * backend — un `::BIGINT` cast, no el código de texto — ver
 * `use-formato-adaptacion-catalog.ts`), obligatorio con
 * `usaVersionModificada = "S"`.
 *
 * `fkTarchivo`/`url` — la referencia de la versión modificada en sí (el
 * archivo, el enlace, o la plantilla de biblioteca):
 * - ARCHIVO: se sube primero por `POST /files/eval-col/planeador/
 *   actividades/:id/adaptaciones/archivo` (V470, mismo patrón que
 *   `subirArchivoMaterial` — un binario por petición, file-service en el
 *   medio) y se manda el `fk_tarchivo` resultante.
 * - ENLACE: `versionModificadaRef` YA es la URL, se manda tal cual.
 * - BIBLIOTECA: el picker (`AdaptacionBibliotecaField`, V471) elige un
 *   `PK_TARCHIVO` que YA existe (de otra actividad) — no hay nada que
 *   subir, se manda directo como `fkTarchivo`, igual que reusar un archivo
 *   ya guardado.
 */
/**
 * El nombre viaja con su extensión real (`adaptacion.archivoNombre`, el
 * `file.name` original) y no fijo ("plantilla") a propósito: el backend
 * infiere el `Content-Type` de cada archivo por la extensión del nombre, no
 * por el `Content-Type` que mande el multipart — confirmado en producción,
 * un nombre sin extensión se sirvió después como `application/octet-
 * stream` y el navegador lo descargaba en vez de mostrarlo, sin importar
 * qué binario fuera.
 */
async function subirArchivoAdaptacion(actividadId: number, adaptacion: Adaptacion): Promise<number> {
  const blob = await fetch(adaptacion.versionModificadaRef).then((r) => r.blob())
  const nombre = adaptacion.archivoNombre || "plantilla"
  const respuesta = await postMultipart<RowsEnvelope<{ fk_tarchivo: number }> | { fk_tarchivo: number }>(
    `/eval-col/planeador/actividades/${actividadId}/adaptaciones/archivo`,
    {},
    { ARCHIVO: new File([blob], nombre, { type: blob.type }) },
  )
  return unwrapRow<{ fk_tarchivo: number }>(respuesta).fk_tarchivo
}

async function updateAdaptacionesActividad({ actividadId, adaptaciones }: UpdateAdaptacionesInput): Promise<void> {
  const cuerpo = await Promise.all(
    adaptaciones.map(async (adaptacion) => {
      const usaVersionModificada = adaptacion.versionModificada && adaptacion.versionModificada !== "no" ? "S" : "N"
      const base = {
        tipoAdaptacion: await resolveTipoAdaptacionId(adaptacion.tipo),
        descripcion: adaptacion.descripcion,
        usaVersionModificada,
        aplicaA: await resolveAplicaAId(adaptacion.aplicaA),
      }
      // Solo se manda si aplica — con "N" el backend rechaza tanto
      // formatoAdaptacion/fkTarchivo/url como con "S" sin ellos, así que
      // omitirlos (en vez de `null`) es el único valor válido en ese caso.
      if (usaVersionModificada !== "S") return base

      const formatoAdaptacion = await resolveFormatoAdaptacionId(adaptacion.versionModificada)
      if (adaptacion.versionModificada === "enlace") {
        return { ...base, formatoAdaptacion, url: adaptacion.versionModificadaRef }
      }
      // BIBLIOTECA: el archivo elegido ya existe (subido en otra
      // actividad, `AdaptacionBibliotecaField`) — se manda directo, sin
      // subir nada.
      if (adaptacion.versionModificada === "biblioteca") {
        if (adaptacion.archivoId === undefined) {
          throw new Error(
            "Elegí una plantilla de la biblioteca institucional para la adaptación marcada como \"Biblioteca\".",
          )
        }
        return { ...base, formatoAdaptacion, fkTarchivo: adaptacion.archivoId }
      }
      // "archivo" — el único caso que sube un binario.
      //
      // Una adaptación YA guardada se reenvía por `archivoId`, sin volver a
      // subir nada — mismo motivo que `subirArchivoMaterial`: el PUT es de
      // REEMPLAZO TOTAL, así que reabrir la actividad y guardar cualquier
      // otro campo (sin tocar la plantilla) se llevaba puesto el archivo.
      if (adaptacion.archivoId !== undefined && !adaptacion.versionModificadaRef.startsWith("blob:")) {
        return { ...base, formatoAdaptacion, fkTarchivo: adaptacion.archivoId }
      }
      // Sin blob URL y sin id no hay nada que enlazar: el docente eligió
      // "Sí, adjuntar plantilla (archivo)" pero no llegó a elegir un archivo.
      if (!adaptacion.versionModificadaRef.startsWith("blob:")) {
        throw new Error("Elegí un archivo de plantilla para la adaptación marcada como \"Archivo\".")
      }
      const fkTarchivo = await subirArchivoAdaptacion(actividadId, adaptacion)
      return { ...base, formatoAdaptacion, fkTarchivo }
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
