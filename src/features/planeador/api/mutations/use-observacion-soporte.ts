import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"
import type { MutationConfig } from "@/lib/react-query"

import { planillaCalificacionesQueryKeyPrefix } from "@/features/planeador/api/query/use-planilla-calificaciones-query"
import { notaEstudianteQueryKey } from "@/features/planeador/api/query/use-nota-estudiante-query"

/**
 * Adjuntar/quitar UNA evidencia de la observación de un estudiante
 * (`TACTIVIDAD_SOPORTE`, V461) — complementa `BODY.EVIDENCIAS` del `PUT
 * .../observar` (reemplazo completo) sin tocar los demás adjuntos.
 */
export interface AgregarSoporteInput {
  pkTactividadEstudiante: number
  archivo: File
  /** `yyyy-MM-dd` — `PlanillaCelda.fechaAsistencia`, mismo gate que observar. */
  fecha: string
}

/** Fila que devuelve el endpoint (agregar y quitar). */
interface SoporteRow {
  pk_tactividad_soporte: number
}

/**
 * Va SIEMPRE por file-service (`/files/eval-col/...`, no `/eval-col/...`):
 * el campo `FK_TARCHIVO` está declarado `FILE:actividad` en el catálogo, así
 * que sube el binario, lo registra en TARCHIVO y reemplaza el campo por su
 * pk antes de reenviar — un solo paso, mismo patrón que los materiales de
 * apoyo (V426).
 */
async function agregarObservacionSoporte(input: AgregarSoporteInput): Promise<number> {
  const respuesta = await postMultipart<RowsEnvelope<SoporteRow> | SoporteRow>(
    `/eval-col/planeador/actividades/estudiantes/${input.pkTactividadEstudiante}/soportes`,
    { FECHA: input.fecha },
    { FK_TARCHIVO: input.archivo },
  )
  return unwrapRow<SoporteRow>(respuesta).pk_tactividad_soporte
}

interface UseAgregarObservacionSoporteOptions {
  mutationConfig?: MutationConfig<typeof agregarObservacionSoporte>
}

export function useAgregarObservacionSoporteMutation({
  mutationConfig,
}: UseAgregarObservacionSoporteOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: agregarObservacionSoporte,
    onSuccess: (result, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: planillaCalificacionesQueryKeyPrefix() })
      queryClient.invalidateQueries({
        queryKey: notaEstudianteQueryKey(variables.pkTactividadEstudiante),
      })
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}

export interface QuitarSoporteInput {
  pkTactividadSoporte: number
  /** Para invalidar la nota de ESE estudiante — el endpoint solo recibe el
   *  pk del soporte, no el del estudiante. */
  pkTactividadEstudiante: number
  /** `yyyy-MM-dd`, mismo gate de asistencia que agregar/observar. */
  fecha: string
}

function quitarObservacionSoporte(input: QuitarSoporteInput): Promise<SoporteRow> {
  return evalCol.putRow<SoporteRow>(
    `/planeador/actividades/estudiantes/soportes/${input.pkTactividadSoporte}`,
    { FECHA: input.fecha },
  )
}

interface UseQuitarObservacionSoporteOptions {
  mutationConfig?: MutationConfig<typeof quitarObservacionSoporte>
}

export function useQuitarObservacionSoporteMutation({
  mutationConfig,
}: UseQuitarObservacionSoporteOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: quitarObservacionSoporte,
    onSuccess: (result, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: planillaCalificacionesQueryKeyPrefix() })
      queryClient.invalidateQueries({
        queryKey: notaEstudianteQueryKey(variables.pkTactividadEstudiante),
      })
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}
