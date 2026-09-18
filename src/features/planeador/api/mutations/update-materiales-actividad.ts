import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { postMultipart } from "@/lib/files"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"
import type { MutationConfig } from "@/lib/react-query"
import { actividadDetalleQueryKey } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { resolveTipoRecursoId } from "@/features/planeador/api/query/use-tipo-recurso-catalog"
import type { Recurso } from "@/features/planeador/api/types/actividad"

interface UpdateMaterialesInput {
  actividadId: number
  recursos: Recurso[]
}

/**
 * `PUT /planeador/actividades/:id/materiales`: reemplazo COMPLETO de los
 * materiales de apoyo de la actividad — un array vacío los deja todos.
 *
 * El backend (`fn_actividad_material_reemplazar`) exige que **cada material
 * traiga exactamente uno** de `url` o `fkTarchivo`. Los de tipo URL y unidad
 * virtual cumplen con `url`; los de tipo "Archivo" necesitan un `fkTarchivo`,
 * y ese id **no** sale de esta llamada: hay que subir el binario antes.
 *
 * ### Por qué son dos pasos
 *
 * Este PUT no recibe archivos. Para subirlos hay un endpoint aparte, uno por
 * archivo (V451):
 *
 * ```
 * POST /files/eval-col/planeador/actividades/<id>/materiales/archivo
 *      multipart, campo ARCHIVO  →  { fk_tarchivo }
 * ```
 *
 * Va por el prefijo `/files` porque el que tiene que interceptarlo es
 * `file-service`: guarda el binario, lo registra en `TARCHIVO` y recién
 * entonces reenvía la petición con el id ya resuelto. Es un archivo por
 * llamada porque el catálogo de queries no puede declarar un campo
 * multi-archivo (no existe `FILE[]`), el mismo patrón que ya usan el soporte
 * de asistencia y los documentos de matrícula.
 *
 * REV — antes esto mandaba el PUT como `multipart/form-data` con partes
 * `archivo_<i>` y un `archivoIndex` dentro del JSON. Nunca funcionó, y no
 * "a medias": `archivoIndex` no lo lee nadie, `file-service` no intercepta
 * `/eval-col/**` y `query-service` no procesa multipart. El backend
 * rechazaba la llamada ENTERA por el material sin `url` ni `fkTarchivo`, así
 * que se perdían también los materiales de URL que iban en el mismo guardado.
 */
export interface UpdateMaterialesResult {
  /** Recursos "Archivo" sin un blob URL válido (no debería pasar desde el
   *  form normal) — para que el caller avise en vez de fallar en silencio. */
  recursosOmitidos: string[]
}

/** Fila que devuelve el endpoint de subida (V451). */
interface ArchivoSubidoRow {
  fk_tarchivo: number
}

/**
 * Sube UN archivo y devuelve su `pk_tarchivo`.
 *
 * El `Blob` se recupera del blob URL acá, al armar la petición, y no se
 * guarda el `File` en el estado del formulario: un `File` no serializa a
 * JSON y rompería el borrador de `actividad-form-draft.ts`.
 */
async function subirArchivoMaterial(
  actividadId: number,
  recurso: Recurso,
): Promise<number> {
  const blob = await fetch(recurso.url).then((r) => r.blob())
  const nombre = recurso.fuente || "archivo"
  // `postMultipart` antepone `/files`, que es lo que hace que la petición
  // pase por `file-service` en vez de ir directo al query-service.
  const respuesta = await postMultipart<RowsEnvelope<ArchivoSubidoRow> | ArchivoSubidoRow>(
    `/eval-col/planeador/actividades/${actividadId}/materiales/archivo`,
    {},
    { ARCHIVO: new File([blob], nombre, { type: blob.type }) },
  )
  return unwrapRow<ArchivoSubidoRow>(respuesta).fk_tarchivo
}

async function updateMaterialesActividad({
  actividadId,
  recursos,
}: UpdateMaterialesInput): Promise<UpdateMaterialesResult> {
  const materiales: Record<string, unknown>[] = []
  const recursosOmitidos: string[] = []

  for (const recurso of recursos) {
    const tipoRecurso = await resolveTipoRecursoId(recurso.tipo)

    if (recurso.tipo !== "Archivo") {
      materiales.push({ tipoRecurso, url: recurso.url, descripcion: recurso.descripcion })
      continue
    }

    // Un archivo YA guardado se reenvía por id, sin volver a subir nada.
    // Esto no es una optimización: el PUT es de REEMPLAZO TOTAL, así que un
    // material que no vaya en la lista se borra. Sin esta rama, reabrir una
    // actividad y guardar cualquier otro campo se llevaba puestos sus
    // archivos.
    if (recurso.archivoId !== undefined && !recurso.url.startsWith("blob:")) {
      materiales.push({ tipoRecurso, fkTarchivo: recurso.archivoId, descripcion: recurso.descripcion })
      continue
    }

    // Sin blob URL y sin id no hay nada que enlazar: ni bytes que subir ni
    // archivo al que apuntar. Se informa al caller en vez de mandar un
    // material que el backend va a rechazar entero.
    if (!recurso.url) {
      recursosOmitidos.push(recurso.titulo || recurso.fuente || "Recurso sin nombre")
      continue
    }

    const fkTarchivo = await subirArchivoMaterial(actividadId, recurso)
    materiales.push({ tipoRecurso, fkTarchivo, descripcion: recurso.descripcion })
  }

  // `MATERIALES` es JSONB y por la regla del motor viaja como STRING
  // serializado, no como array anidado — mismo trato que `DEFINICION` del
  // instrumento o `ADAPTACIONES`.
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
