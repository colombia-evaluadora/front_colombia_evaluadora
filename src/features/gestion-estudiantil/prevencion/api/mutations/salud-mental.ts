import { evalCol } from "@/lib/eval-col-client"

import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import {
  usePrevencionMutation,
  type MutationCfg,
} from "@/features/gestion-estudiantil/prevencion/api/mutations/use-prevencion-mutation"
import type {
  AtencionSenalInput,
  ReportarSenalInput,
  ResultadoEscritura,
  ValorarSenalInput,
} from "@/features/gestion-estudiantil/prevencion/api/types"

/** `POST /salud-mental`: reporta la señal (queda Por valorar). */
const reportarSenal = (input: ReportarSenalInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_PREVENCION}/salud-mental`, {
    ...input,
    LO_OBSERVADO: input.LO_OBSERVADO.trim(),
  })

export const useReportarSenal = ({ mutationConfig }: MutationCfg<typeof reportarSenal> = {}) =>
  usePrevencionMutation(reportarSenal, mutationConfig)

/** `POST /salud-mental/:ID/valoracion`: valora o revalora; Crítico o Vital activan la ruta de remisión. */
const valorarSenal = ({ id, FK_SEVERIDAD, NOTAS }: ValorarSenalInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_PREVENCION}/salud-mental/${id}/valoracion`, {
    FK_SEVERIDAD,
    NOTAS: NOTAS.trim(),
  })

export const useValorarSenal = ({ mutationConfig }: MutationCfg<typeof valorarSenal> = {}) =>
  usePrevencionMutation(valorarSenal, mutationConfig)

/** `POST /salud-mental/:ID/atenciones`: con FK_ENTIDAD la señal pasa a Remitida; sin ella, a En atención. */
const registrarAtencion = ({ id, ACCION, FK_ENTIDAD, FECHA }: AtencionSenalInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_PREVENCION}/salud-mental/${id}/atenciones`, {
    ACCION: ACCION.trim(),
    FK_ENTIDAD,
    FECHA,
  })

export const useRegistrarAtencion = ({ mutationConfig }: MutationCfg<typeof registrarAtencion> = {}) =>
  usePrevencionMutation(registrarAtencion, mutationConfig)

/** `POST /salud-mental/:ID/cerrar`: final; 400 si la señal no está valorada. */
const cerrarSenal = ({ id }: { id: number }) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_PREVENCION}/salud-mental/${id}/cerrar`, {})

export const useCerrarSenal = ({ mutationConfig }: MutationCfg<typeof cerrarSenal> = {}) =>
  usePrevencionMutation(cerrarSenal, mutationConfig)
