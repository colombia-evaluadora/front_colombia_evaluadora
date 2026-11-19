import { evalCol } from "@/lib/eval-col-client"

import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import {
  usePrevencionMutation,
  type MutationCfg,
} from "@/features/gestion-estudiantil/prevencion/api/mutations/use-prevencion-mutation"
import type {
  GuardarCaracterizacionInput,
  ResultadoEscritura,
  RevisarFactoresInput,
} from "@/features/gestion-estudiantil/prevencion/api/types"

const BASE = `${BASE_PREVENCION}/caracterizaciones`

/**
 * `PUT /caracterizaciones/:MATRICULA`: guarda y confirma (queda Confirmada con fecha y autor). `DATOS` es un objeto
 * JSONB: el ParamBinder lo exige serializado (un objeto anidado se aplana y `BODY.DATOS` llega como omitido).
 */
const guardarCaracterizacion = ({ matricula, DATOS }: GuardarCaracterizacionInput) =>
  evalCol.putRow<ResultadoEscritura>(`${BASE}/${matricula}`, { DATOS: JSON.stringify(DATOS) })

export const useGuardarCaracterizacion = ({ mutationConfig }: MutationCfg<typeof guardarCaracterizacion> = {}) =>
  usePrevencionMutation(guardarCaracterizacion, mutationConfig)

/** `POST /caracterizaciones/:MATRICULA/revision-factores`: aparte de la confirmación familiar. */
const revisarFactores = ({ matricula, ...cuerpo }: RevisarFactoresInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE}/${matricula}/revision-factores`, cuerpo)

export const useRevisarFactores = ({ mutationConfig }: MutationCfg<typeof revisarFactores> = {}) =>
  usePrevencionMutation(revisarFactores, mutationConfig)
