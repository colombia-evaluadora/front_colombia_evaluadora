import { useMutation } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { downloadReport } from "@/lib/report-client"

import { BASE_ACOMPANAMIENTOS } from "@/features/gestion-estudiantil/prevencion/api/query/use-acompanamientos-query"
import { subirSoportePrevencion } from "@/features/gestion-estudiantil/prevencion/api/mutations/soporte-prevencion"
import {
  usePrevencionMutation,
  type MutationCfg,
} from "@/features/gestion-estudiantil/prevencion/api/mutations/use-prevencion-mutation"
import type {
  AccionAcompInput,
  AcompanamientosQueryFilters,
  AcompConsumoInput,
  AcompEmbarazoInput,
  CrearAcompConsumoInput,
  CrearAcompEmbarazoInput,
  ReportarConsumoInput,
  ResultadoAccionAcompInput,
  ResultadoEscritura,
  TipoAcompanamiento,
  VincularReporteInput,
} from "@/features/gestion-estudiantil/prevencion/api/types"

/** `POST /acompanamientos/embarazo`: sin CREAR_DE_TODOS_MODOS, un abierto del estudiante responde el error de duplicado. */
const crearAcompEmbarazo = (input: CrearAcompEmbarazoInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_ACOMPANAMIENTOS}/embarazo`, input)

export const useCrearAcompEmbarazo = ({ mutationConfig }: MutationCfg<typeof crearAcompEmbarazo> = {}) =>
  usePrevencionMutation(crearAcompEmbarazo, mutationConfig)

/** `PUT /acompanamientos/embarazo/:ID`. */
const modificarAcompEmbarazo = ({ id, ...input }: AcompEmbarazoInput & { id: number }) =>
  evalCol.putRow<ResultadoEscritura>(`${BASE_ACOMPANAMIENTOS}/embarazo/${id}`, input)

export const useModificarAcompEmbarazo = ({ mutationConfig }: MutationCfg<typeof modificarAcompEmbarazo> = {}) =>
  usePrevencionMutation(modificarAcompEmbarazo, mutationConfig)

/** `POST /acompanamientos/consumo`: mismo aviso de duplicado que embarazo. */
const crearAcompConsumo = (input: CrearAcompConsumoInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_ACOMPANAMIENTOS}/consumo`, input)

export const useCrearAcompConsumo = ({ mutationConfig }: MutationCfg<typeof crearAcompConsumo> = {}) =>
  usePrevencionMutation(crearAcompConsumo, mutationConfig)

/** `PUT /acompanamientos/consumo/:ID`. */
const modificarAcompConsumo = ({ id, ...input }: AcompConsumoInput & { id: number }) =>
  evalCol.putRow<ResultadoEscritura>(`${BASE_ACOMPANAMIENTOS}/consumo/${id}`, input)

export const useModificarAcompConsumo = ({ mutationConfig }: MutationCfg<typeof modificarAcompConsumo> = {}) =>
  usePrevencionMutation(modificarAcompConsumo, mutationConfig)

/** `POST /acompanamientos/:ID/acciones`: crea (sin ACCION) o edita (con ACCION) una acción o remisión. */
const guardarAccionAcomp = ({ id, ...input }: AccionAcompInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_ACOMPANAMIENTOS}/${id}/acciones`, input)

export const useGuardarAccionAcomp = ({ mutationConfig }: MutationCfg<typeof guardarAccionAcomp> = {}) =>
  usePrevencionMutation(guardarAccionAcomp, mutationConfig)

/** `POST /acompanamientos/acciones/:ID/resultado`: el Responsable de la acción u orientación. */
const resultadoAccionAcomp = ({ accionId, RESULTADO, SOPORTES }: ResultadoAccionAcompInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_ACOMPANAMIENTOS}/acciones/${accionId}/resultado`, {
    RESULTADO: RESULTADO.trim(),
    SOPORTES,
  })

export const useResultadoAccionAcomp = ({ mutationConfig }: MutationCfg<typeof resultadoAccionAcomp> = {}) =>
  usePrevencionMutation(resultadoAccionAcomp, mutationConfig)

/** `POST /acompanamientos/:ID/cerrar`: final, no se reabre. */
const cerrarAcomp = ({ id, RESUMEN }: { id: number; RESUMEN: string }) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_ACOMPANAMIENTOS}/${id}/cerrar`, { RESUMEN: RESUMEN.trim() })

export const useCerrarAcomp = ({ mutationConfig }: MutationCfg<typeof cerrarAcomp> = {}) =>
  usePrevencionMutation(cerrarAcomp, mutationConfig)

/** `POST /acompanamientos/:ID/anular`: Supervisor de sede o Administrador, con motivo. */
const anularAcomp = ({ id, MOTIVO }: { id: number; MOTIVO: string }) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_ACOMPANAMIENTOS}/${id}/anular`, { MOTIVO: MOTIVO.trim() })

export const useAnularAcomp = ({ mutationConfig }: MutationCfg<typeof anularAcomp> = {}) =>
  usePrevencionMutation(anularAcomp, mutationConfig)

/** `POST /acompanamientos/consumo/reportes/:ID/vincular`: a uno existente o a uno nuevo; el reporte queda Atendido. */
const vincularReporte = ({ id, ...input }: VincularReporteInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_ACOMPANAMIENTOS}/consumo/reportes/${id}/vincular`, input)

export const useVincularReporte = ({ mutationConfig }: MutationCfg<typeof vincularReporte> = {}) =>
  usePrevencionMutation(vincularReporte, mutationConfig)

/** `POST /acompanamientos/consumo/reportes`: el Responsable de enseñanza reporta (G.1.REP.4); queda Pendiente de revisión. */
const reportarConsumo = (input: ReportarConsumoInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_ACOMPANAMIENTOS}/consumo/reportes`, {
    ...input,
    FUENTE: input.FUENTE.trim(),
    DESCRIPCION: input.DESCRIPCION.trim(),
  })

export const useReportarConsumo = ({ mutationConfig }: MutationCfg<typeof reportarConsumo> = {}) =>
  usePrevencionMutation(reportarConsumo, mutationConfig)

/** `POST /acompanamientos/soporte` (file-service, campo `SOPORTE`): devuelve el pk del TARCHIVO para `SOPORTES`. */
export const subirSoporteAcomp = (file: File) => subirSoportePrevencion(file, `${BASE_ACOMPANAMIENTOS}/soporte`)

const CLAVE_SIUCE = { EMBARAZO: "prevencion-embarazo-siuce", CONSUMO: "prevencion-consumo-siuce" } as const

export interface ExportarSiuceAcompInput {
  tipo: TipoAcompanamiento
  /** Los filtros del listado (sin TIPO) y, para exportar seleccionados, IDS. */
  filters: Omit<AcompanamientosQueryFilters, "TIPO"> & { IDS?: number[] | null }
  columnas: string[]
}

/** Excel de apoyo al SIUCE (reporting-service): mismos filtros del listado bajo `BODY.FILTERS`. */
function exportarSiuceAcomp({ tipo, filters, columnas }: ExportarSiuceAcompInput) {
  return downloadReport(CLAVE_SIUCE[tipo], { format: "excel", columns: columnas, filters, omitirVacio: true })
}

export function useExportarSiuceAcomp({ mutationConfig }: { mutationConfig?: MutationConfig<typeof exportarSiuceAcomp> } = {}) {
  return useMutation({ mutationFn: exportarSiuceAcomp, ...mutationConfig })
}
