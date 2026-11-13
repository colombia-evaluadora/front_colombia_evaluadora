import { evalCol } from "@/lib/eval-col-client"

import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import {
  usePrevencionMutation,
  type MutationCfg,
} from "@/features/gestion-estudiantil/prevencion/api/mutations/use-prevencion-mutation"
import type {
  AceptacionPresencialInput,
  AnularInput,
  CrearPlanInput,
  MarcarPlanInput,
  ModificarPlanInput,
  RegistrarAvanceInput,
  ResultadoEscritura,
} from "@/features/gestion-estudiantil/prevencion/api/types"

/** `POST /planes`: `ACCIONES` viaja como JSONB (arreglo de objetos), no como texto. */
const crearPlan = (input: CrearPlanInput) => evalCol.postRow<ResultadoEscritura>(`${BASE_PREVENCION}/planes`, input)

export const useCrearPlan = ({ mutationConfig }: MutationCfg<typeof crearPlan> = {}) =>
  usePrevencionMutation(crearPlan, mutationConfig)

/** `PUT /planes/:ID`: solo Propuesto o Activo. */
const modificarPlan = ({ id, ...body }: ModificarPlanInput) =>
  evalCol.putRow<ResultadoEscritura>(`${BASE_PREVENCION}/planes/${id}`, body)

export const useModificarPlan = ({ mutationConfig }: MutationCfg<typeof modificarPlan> = {}) =>
  usePrevencionMutation(modificarPlan, mutationConfig)

/** `POST /planes/:ID/aceptacion-presencial`: el soporte (pk de `subirSoportePrevencion`) es obligatorio. */
const aceptarPresencial = ({ id, ...body }: AceptacionPresencialInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_PREVENCION}/planes/${id}/aceptacion-presencial`, body)

export const useAceptarPresencial = ({ mutationConfig }: MutationCfg<typeof aceptarPresencial> = {}) =>
  usePrevencionMutation(aceptarPresencial, mutationConfig)

/** `POST /planes/:ID/marcar`: Superado o Incumplido (plan En seguimiento). */
const marcarPlan = ({ id, ESTADO }: MarcarPlanInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_PREVENCION}/planes/${id}/marcar`, { ESTADO })

export const useMarcarPlan = ({ mutationConfig }: MutationCfg<typeof marcarPlan> = {}) =>
  usePrevencionMutation(marcarPlan, mutationConfig)

/** `POST /planes/:ID/anular`: con motivo. */
const anularPlan = ({ id, MOTIVO }: AnularInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_PREVENCION}/planes/${id}/anular`, { MOTIVO: MOTIVO.trim() })

export const useAnularPlan = ({ mutationConfig }: MutationCfg<typeof anularPlan> = {}) =>
  usePrevencionMutation(anularPlan, mutationConfig)

/** `POST /acciones/:ID/avances`: `id` es la pk de la acción. */
const registrarAvance = ({ id, DESCRIPCION, ...body }: RegistrarAvanceInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_PREVENCION}/acciones/${id}/avances`, {
    ...body,
    DESCRIPCION: DESCRIPCION.trim(),
  })

export const useRegistrarAvance = ({ mutationConfig }: MutationCfg<typeof registrarAvance> = {}) =>
  usePrevencionMutation(registrarAvance, mutationConfig)
