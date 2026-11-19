import { evalCol } from "@/lib/eval-col-client"

import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import {
  usePrevencionMutation,
  type MutationCfg,
} from "@/features/gestion-estudiantil/prevencion/api/mutations/use-prevencion-mutation"
import type {
  AnularInput,
  CrearValoracionInput,
  ResultadoEscritura,
} from "@/features/gestion-estudiantil/prevencion/api/types"

/** `POST /valoraciones`: valorar el riesgo (nivel y análisis son obligatorios). */
const crearValoracion = (input: CrearValoracionInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_PREVENCION}/valoraciones`, { ...input, ANALISIS: input.ANALISIS.trim() })

export const useCrearValoracion = ({ mutationConfig }: MutationCfg<typeof crearValoracion> = {}) =>
  usePrevencionMutation(crearValoracion, mutationConfig)

/** `POST /valoraciones/:ID/anular`: se anula con motivo, no se elimina. */
const anularValoracion = ({ id, MOTIVO }: AnularInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_PREVENCION}/valoraciones/${id}/anular`, { MOTIVO: MOTIVO.trim() })

export const useAnularValoracion = ({ mutationConfig }: MutationCfg<typeof anularValoracion> = {}) =>
  usePrevencionMutation(anularValoracion, mutationConfig)
