import { useMutation, useQueryClient } from "@tanstack/react-query"
import { writeConfig, type WriteRequest } from "@/lib/offline/outbox/write-request"

import { api } from "@/lib/api-client"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"

import { invalidarListadosActividades } from "@/features/planeador/api/query/invalidar-listados-actividades"
import { resolveTipoActividadId } from "@/features/planeador/api/query/use-tipo-actividad-catalog"
import { resolveInstrumentoEvaluacionId } from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"
import { resolveModalidadId } from "@/features/planeador/api/query/use-modalidad-catalog"
import { resolveTipoEvidenciaId } from "@/features/planeador/api/query/use-tipo-evidencia-catalog"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import { toRecuperacionBody } from "@/features/planeador/api/mutations/recuperacion-body"

interface UpdateActividadInput {
  actividadId: number
  data: Actividad
}

/**
 * PUT parcial: campo ausente preserva el valor. No manda `FK_TUNIDAD` (lo resuelven link/unlink, que
 * validan la ponderación) ni estudiantes (`PUT .../estudiantes`), materiales o adaptaciones.
 */
export async function updateActividad({ actividadId, data }: UpdateActividadInput, req?: WriteRequest): Promise<unknown> {
  if (env.ENABLE_API_MOCKING) {
    return api.put(`/eval-col/planeador/actividades/${actividadId}`, data, writeConfig(req))
  }
  const body: Record<string, unknown> = {
    TITULO: data.nombre,
    DESCRIPCION: data.descripcion ?? "",
    ES_EVALUATIVA: data.esEvaluativa ? "S" : "N",
    FECHA_INICIO: data.fechaInicio,
    FECHA_CIERRE: data.fechaCierre,
    MATERIAL_REQUERIDO: data.materiales,
    // Convención "S"/"N": el backend castea a `bool_sn`.
    GENERA_EVIDENCIAS: data.generaEvidencias ? "S" : "N",
    REQUIERE_VALIDACION_COORDINADOR: data.requiereValidacion ? "S" : "N",
    OBSERVACIONES_DOCENTE: data.observaciones,
  }
  const [tipoActividadId, tipoEvidenciaId, modalidadId, instrumentoId, recuperacion] = await Promise.all([
    resolveTipoActividadId(data.tipo),
    data.tipoEvidencia ? resolveTipoEvidenciaId(data.tipoEvidencia) : undefined,
    data.modalidad ? resolveModalidadId(data.modalidad) : undefined,
    data.esEvaluativa ? resolveInstrumentoEvaluacionId(data.instrumento) : undefined,
    data.esEvaluativa && data.esRecuperacion && data.recuperacionDestino ? toRecuperacionBody(data) : undefined,
  ])
  if (data.duracionEstimada) body.DURACION_ESTIMADA = Number(data.duracionEstimada)
  if (data.semana) body.SEMANA_CRONOGRAMA = data.semana
  // Catálogos best-effort: si no resuelven, se omite el campo.
  if (data.tipoEvidencia) {
    if (tipoEvidenciaId != null) body.FK_TLV_TIPO_EVIDENCIA = tipoEvidenciaId
  }
  if (data.modalidad) {
    if (modalidadId != null) body.FK_TLV_MODALIDAD = modalidadId
  }
  if (data.grupoId != null) body.FK_TGRUPO = data.grupoId
  if (data.asignaturaId != null) body.FK_TASIGNATURA = data.asignaturaId
  if (tipoActividadId != null) body.FK_TLV_TIPO_ACTIVIDAD = tipoActividadId
  // `NOTA_MAXIMA` y `PONDERACION` son excluyentes; el form deja solo uno.
  if (data.esEvaluativa && data.notaMaxima != null) body.NOTA_MAXIMA = data.notaMaxima
  else if (data.esEvaluativa && data.ponderacion > 0) body.PONDERACION = data.ponderacion
  // Debe ir antes de `PUT .../instrumento`: ese endpoint exige que el instrumento ya coincida (400/22023).
  if (data.esEvaluativa) {
    if (instrumentoId != null) body.FK_TLV_INSTRUMENTO_EVALUACION = instrumentoId
  }
  // Solo el instrumento personalizado ("Otro") tiene estos campos.
  if (data.instrumento === "Otro") {
    const { instrumentoPersonalizado } = data
    body.REQUIERE_ARCHIVO = instrumentoPersonalizado.requiereArchivo ? "S" : "N"
    body.REQUIERE_TEXTO = instrumentoPersonalizado.requiereRespuestaTexto ? "S" : "N"
    if (instrumentoPersonalizado.descripcion) body.DESCRIPCION_INSTRUMENTO = instrumentoPersonalizado.descripcion
  }
  // `RECUPERACION` y `QUITAR_RECUPERACION` son excluyentes; sin `recuperacionDestino` no se configura.
  if (data.esEvaluativa && data.esRecuperacion && data.recuperacionDestino) {
    body.RECUPERACION = recuperacion
  } else if (!data.esRecuperacion) {
    // Idempotente en el backend: seguro aunque la actividad nunca haya sido recuperación.
    body.QUITAR_RECUPERACION = true
  }
  // Reemplazo completo de evidencias/criterios; solo aplica si sigue vinculada a una unidad.
  if (data.unidad.id !== 0) {
    body.EVIDENCIAS = data.evidenciasIds
    body.CRITERIOS = data.criteriosUnidadIds
  }
  return api.put(`/eval-col/planeador/actividades/${actividadId}`, body, writeConfig(req))
}

interface UseUpdateActividadOptions {
  mutationConfig?: MutationConfig<typeof updateActividad>
}

export function useUpdateActividad({ mutationConfig }: UseUpdateActividadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: (input: UpdateActividadInput) => updateActividad(input),
    onSuccess: (data, variables, ...rest) => {
      invalidarListadosActividades(queryClient, { detalleId: variables.actividadId })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}
