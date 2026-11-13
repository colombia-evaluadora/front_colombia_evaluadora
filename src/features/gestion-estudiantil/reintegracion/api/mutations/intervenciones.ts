import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"

import { BASE_REINTEGRACION } from "@/features/gestion-estudiantil/reintegracion/api/query/use-casos-query"
import {
  useReintegracionMutation,
  type MutationCfg,
} from "@/features/gestion-estudiantil/reintegracion/api/mutations/use-reintegracion-mutation"
import type {
  IntervencionInput,
  ModificarIntervencionInput,
  ResultadoEscritura,
} from "@/features/gestion-estudiantil/reintegracion/api/types"

const intervencionesUrl = (caso: number) => `${BASE_REINTEGRACION}/casos/${caso}/intervenciones`

/** `POST /casos/:ID/intervenciones`: con fecha de realización exige resultado y trabajo realizado de 10 a 3000. */
const registrarIntervencion = ({ id, ...body }: IntervencionInput) =>
  evalCol.postRow<ResultadoEscritura>(intervencionesUrl(id), body)

export const useRegistrarIntervencion = ({ mutationConfig }: MutationCfg<typeof registrarIntervencion> = {}) =>
  useReintegracionMutation(registrarIntervencion, mutationConfig)

/** `PUT /casos/:ID/intervenciones/:INTERVENCION`: `EVIDENCIAS` es el conjunto completo; sin enviarlo se conservan. */
const modificarIntervencion = ({ id, intervencion, ...body }: ModificarIntervencionInput) =>
  evalCol.putRow<ResultadoEscritura>(`${intervencionesUrl(id)}/${intervencion}`, body)

export const useModificarIntervencion = ({ mutationConfig }: MutationCfg<typeof modificarIntervencion> = {}) =>
  useReintegracionMutation(modificarIntervencion, mutationConfig)

/**
 * `POST /reintegracion/soporte` (file-service, campo `SOPORTE`, PDF o imagen hasta 10 MB): la misma llamada
 * reserva el TARCHIVO y responde su pk, que va en `EVIDENCIAS` (hasta 5) al guardar la intervención.
 */
export async function subirSoporteReintegracion(file: File): Promise<number> {
  const raw = await postMultipart<{ rows?: Record<string, unknown>[] } | Record<string, unknown>>(
    `/eval-col${BASE_REINTEGRACION}/soporte`,
    {},
    { SOPORTE: file },
  )
  const fila = (raw && "rows" in raw && Array.isArray(raw.rows) ? raw.rows[0] : raw) as Record<string, unknown>
  const pk = fila?.pk_tarchivo ?? Object.values(fila ?? {}).find((v) => typeof v === "number")
  if (typeof pk !== "number") throw new Error("No se pudo cargar el soporte.")
  return pk
}
