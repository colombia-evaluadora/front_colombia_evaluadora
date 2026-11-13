import { evalCol } from "@/lib/eval-col-client"

import { BASE_REINTEGRACION } from "@/features/gestion-estudiantil/reintegracion/api/query/use-casos-query"
import { BASE_COMUN } from "@/features/gestion-estudiantil/reintegracion/api/query/use-remisiones-query"
import {
  useReintegracionMutation,
  type MutationCfg,
} from "@/features/gestion-estudiantil/reintegracion/api/mutations/use-reintegracion-mutation"
import type {
  GestionRemisionInput,
  RecordatoriosRemisionInput,
  RegistrarRemisionInput,
  ResponderRemisionInput,
  ResultadoEscritura,
} from "@/features/gestion-estudiantil/reintegracion/api/types"

const remisionUrl = (id: number, accion: string) => `${BASE_COMUN}/remisiones-externas/${id}${accion}`

/** `POST /casos/:ID/remisiones`: motivo de 10 a 2000; el ajuste de plazo pide `MOTIVO_AJUSTE`. */
const registrarRemision = ({ id, ...body }: RegistrarRemisionInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_REINTEGRACION}/casos/${id}/remisiones`, body)

export const useRegistrarRemision = ({ mutationConfig }: MutationCfg<typeof registrarRemision> = {}) =>
  useReintegracionMutation(registrarRemision, mutationConfig)

/** `POST /remisiones-externas/:ID/respuesta` (común, V669). */
const responderRemision = ({ id, ...body }: ResponderRemisionInput) =>
  evalCol.postRow<ResultadoEscritura>(remisionUrl(id, "/respuesta"), body)

export const useResponderRemision = ({ mutationConfig }: MutationCfg<typeof responderRemision> = {}) =>
  useReintegracionMutation(responderRemision, mutationConfig)

/** `POST /remisiones-externas/:ID/gestiones` (común, V669): `NUEVA_FECHA` y `MOTIVO_AJUSTE` van juntos o ninguno. */
const registrarGestion = ({ id, ...body }: GestionRemisionInput) =>
  evalCol.postRow<ResultadoEscritura>(remisionUrl(id, "/gestiones"), body)

export const useRegistrarGestion = ({ mutationConfig }: MutationCfg<typeof registrarGestion> = {}) =>
  useReintegracionMutation(registrarGestion, mutationConfig)

/** `PUT /remisiones-externas/:ID/recordatorios` (común, V669): sin fechas quita todos; responde cuántos quedan. */
const cambiarRecordatorios = ({ id, FECHAS }: RecordatoriosRemisionInput) =>
  evalCol.putRow<{ recordatorios: number }>(remisionUrl(id, "/recordatorios"), { FECHAS })

export const useCambiarRecordatorios = ({ mutationConfig }: MutationCfg<typeof cambiarRecordatorios> = {}) =>
  useReintegracionMutation(cambiarRecordatorios, mutationConfig)

/** `PUT /configuracion-remisiones/plazo` (común, V669): días hábiles; rige solo para remisiones nuevas. */
const editarPlazo = ({ ESTABLECIMIENTO, PLAZO }: { ESTABLECIMIENTO: number; PLAZO: number }) =>
  evalCol.putRow<ResultadoEscritura>(`${BASE_COMUN}/configuracion-remisiones/plazo`, { ESTABLECIMIENTO, PLAZO })

export const useEditarPlazoRemisiones = ({ mutationConfig }: MutationCfg<typeof editarPlazo> = {}) =>
  useReintegracionMutation(editarPlazo, mutationConfig)
