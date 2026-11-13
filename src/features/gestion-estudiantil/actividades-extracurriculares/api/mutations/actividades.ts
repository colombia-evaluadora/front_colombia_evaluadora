import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"

import { desenvolver } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { BASE_ACTIVIDADES } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-actividades-query"
import {
  useActividadesMutation,
  type MutationCfg,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/mutations/use-actividades-mutation"
import type {
  ActividadInput,
  CambiarEstadoActividadInput,
  InscribirInput,
  ModificarActividadInput,
  NuevaSesionInput,
  NuevaSesionResultado,
  ResultadoEscritura,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"

/** `POST /actividades`: crea la actividad y sus grados; devuelve el id. */
const crearActividad = ({ NOMBRE, ...resto }: ActividadInput) =>
  evalCol.postRow<ResultadoEscritura>(BASE_ACTIVIDADES, { ...resto, NOMBRE: NOMBRE.trim() })

export const useCrearActividad = ({ mutationConfig }: MutationCfg<typeof crearActividad> = {}) =>
  useActividadesMutation(crearActividad, mutationConfig)

/** `PUT /actividades/:ID`: sede, jornada, período y estado no cambian. */
const modificarActividad = ({ id, NOMBRE, ...resto }: ModificarActividadInput) =>
  evalCol.putRow<ResultadoEscritura>(`${BASE_ACTIVIDADES}/${id}`, { ...resto, NOMBRE: NOMBRE.trim() })

export const useModificarActividad = ({ mutationConfig }: MutationCfg<typeof modificarActividad> = {}) =>
  useActividadesMutation(modificarActividad, mutationConfig)

/** `PUT /actividades/:ID/estado`: Activar o Inactivar. */
const cambiarEstadoActividad = ({ id, ESTADO }: CambiarEstadoActividadInput) =>
  evalCol.putRow<ResultadoEscritura>(`${BASE_ACTIVIDADES}/${id}/estado`, { ESTADO })

export const useCambiarEstadoActividad = ({ mutationConfig }: MutationCfg<typeof cambiarEstadoActividad> = {}) =>
  useActividadesMutation(cambiarEstadoActividad, mutationConfig)

/** `POST /actividades/:ID/participantes`: inscribe una matrícula (409 si el cupo está completo). */
const inscribirEstudiante = ({ id, ...body }: InscribirInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_ACTIVIDADES}/${id}/participantes`, body)

export const useInscribirEstudiante = ({ mutationConfig }: MutationCfg<typeof inscribirEstudiante> = {}) =>
  useActividadesMutation(inscribirEstudiante, mutationConfig)

/** `PUT /actividades/participantes/:ID/retirar`. */
const retirarParticipante = ({ id }: { id: number }) =>
  evalCol.putRow<ResultadoEscritura>(`${BASE_ACTIVIDADES}/participantes/${id}/retirar`, {})

export const useRetirarParticipante = ({ mutationConfig }: MutationCfg<typeof retirarParticipante> = {}) =>
  useActividadesMutation(retirarParticipante, mutationConfig)

/** `POST /actividades/:ID/sesiones`: registra la sesión con sus asistentes; en servicio social suma horas. */
const registrarSesion = async ({ id, OBSERVACION, ...resto }: NuevaSesionInput) =>
  // El JSONB llega en la columna `resultado` ({id, asistentes, servicio_social}).
  desenvolver<NuevaSesionResultado>(
    await evalCol.postRow<Record<string, unknown>>(`${BASE_ACTIVIDADES}/${id}/sesiones`, {
      ...resto,
      OBSERVACION: OBSERVACION?.trim() || null,
    }),
    "resultado",
    "No se pudo registrar la sesión.",
  )

export const useRegistrarSesion = ({ mutationConfig }: MutationCfg<typeof registrarSesion> = {}) =>
  useActividadesMutation(registrarSesion, mutationConfig)

/** `POST /files/eval-col/.../actividades/soporte` (file-service): devuelve el `pk_tarchivo` del soporte. */
export async function subirSoporteActividad(file: File): Promise<number> {
  const raw = await postMultipart<{ rows?: Record<string, unknown>[] } | Record<string, unknown>>(
    `/eval-col${BASE_ACTIVIDADES}/soporte`,
    {},
    { SOPORTE: file },
  )
  const fila = (raw && "rows" in raw && Array.isArray(raw.rows) ? raw.rows[0] : raw) as Record<string, unknown>
  const pk = fila?.pk_tarchivo ?? Object.values(fila ?? {}).find((v) => typeof v === "number")
  if (typeof pk !== "number") throw new Error("No se pudo cargar el soporte.")
  return pk
}
