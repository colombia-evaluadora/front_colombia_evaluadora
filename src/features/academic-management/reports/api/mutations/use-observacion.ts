import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import { runOrQueue } from "@/lib/offline/outbox/engine"
import { registerOutboxHandler } from "@/lib/offline/outbox/registry"
import type { MutationConfig } from "@/lib/react-query"

import { informeGrupoQueryKeyPrefix } from "@/features/academic-management/reports/api/query/use-informe-grupo-query"

export interface ObservacionGenerada {
  texto: string
  /** Cuántas observaciones (o períodos, en la fila Final) resumió. Se
   *  reenvía al guardar: el backend lo compara contra cuántas hay hoy para
   *  marcar `observacion_desactualizada`. */
  observacionesOrigen: number
  /** El resumen no cambió desde la última vez que se generó: `ai-control-
   *  service` devolvió el mismo texto guardado sin volver a llamar al modelo. */
  desdeCache: boolean
}

interface GenerarIaResponse {
  observacion: string
  origen: number
  estado: string
  modelo: string
  tokensEntrada: number
  tokensSalida: number
  duracionMs: number
  desdeCache: boolean
}

export interface GenerarObservacionInput {
  matriculaId: number
  /** `null` = la fila Final: el comentario del año, que tiene su propio
   *  endpoint porque encadena los resúmenes de período YA consolidados y no
   *  las observaciones por actividad. */
  periodoId: number | null
  /** Confirma reemplazar un texto que el docente ya modificó a mano. Sin
   *  esto, un texto `MODIFICADA` responde 409 en vez de pisarse. */
  sobrescribir?: boolean
}

/** `POST /ai/observaciones/periodo` y `POST /ai/observaciones/anio`, de
 *  `ai-control-service`. Redacta el resumen con el modelo de lenguaje y lo
 *  GUARDA de una vez —nace `APROBADA`—, así que a diferencia del viejo
 *  `/informes/observacion/generar` esto ya no es de solo lectura: llamarlo
 *  sobre un texto que el docente modificó responde 409 salvo que se mande
 *  `sobrescribir`. */
async function generarObservacion(input: GenerarObservacionInput): Promise<ObservacionGenerada> {
  const url = input.periodoId === null ? "/ai/observaciones/anio" : "/ai/observaciones/periodo"
  const data = await api.post<GenerarIaResponse>(url, {
    FK_TMATRICULA: input.matriculaId,
    ...(input.periodoId !== null && { FK_TPERIODO_EVALUACION: input.periodoId }),
    ...(input.sobrescribir && { SOBRESCRIBIR: true }),
  })
  return {
    texto: data.observacion,
    observacionesOrigen: data.origen,
    desdeCache: data.desdeCache,
  }
}

export interface GuardarObservacionInput {
  matriculaId: number
  /** `null` = la fila Final. */
  periodoId: number | null
  observacion: string
  /** El borrador tal como llegó de `generar`. Sin esto el backend no puede
   *  distinguir "guardé sin editar" de "edité", y marca `APROBADA`. Va
   *  ausente —no vacío— cuando el docente escribió a mano. */
  observacionIa?: string
  observacionesOrigen?: number
}

/** `POST /informes/observacion/guardar`. El estado sale de comparar el texto
 *  contra `OBSERVACION_IA`: iguales → `APROBADA`, distintos → `MODIFICADA`. */
async function enviarGuardarObservacion(input: GuardarObservacionInput): Promise<void> {
  if (input.periodoId === null) {
    await evalCol.postRows("/informes/observacion/final/guardar", {
      FK_TMATRICULA: input.matriculaId,
      OBSERVACION: input.observacion,
      ...(input.observacionIa != null && { OBSERVACION_IA: input.observacionIa }),
      ...(input.observacionesOrigen != null && {
        PERIODOS_ORIGEN: input.observacionesOrigen,
      }),
    })
    return
  }
  await evalCol.postRows("/informes/observacion/guardar", {
    FK_TMATRICULA: input.matriculaId,
    FK_TPERIODO_EVALUACION: input.periodoId,
    OBSERVACION: input.observacion,
    ...(input.observacionIa != null && { OBSERVACION_IA: input.observacionIa }),
    ...(input.observacionesOrigen != null && {
      OBSERVACIONES_ORIGEN: input.observacionesOrigen,
    }),
  })
}

export interface EliminarObservacionInput {
  matriculaId: number
  /** `null` = la fila Final. */
  periodoId: number | null
}

/** `POST /informes/observacion/eliminar`. Borrado físico: el índice único es
 *  total sobre (matrícula, período) y una fila inactiva impediría guardar
 *  una nueva. Llamarlo dos veces responde 404. */
async function enviarEliminarObservacion(input: EliminarObservacionInput): Promise<void> {
  if (input.periodoId === null) {
    await evalCol.postRows("/informes/observacion/final/eliminar", {
      FK_TMATRICULA: input.matriculaId,
    })
    return
  }
  await evalCol.postRows("/informes/observacion/eliminar", {
    FK_TMATRICULA: input.matriculaId,
    FK_TPERIODO_EVALUACION: input.periodoId,
  })
}

/**
 * Fase 4 offline (`add-offline-rest`): guardar y eliminar la observación
 * cualitativa a mano se encolan en la outbox con un solo `kind` por
 * (matrícula, período), así un "guardar" seguido de "eliminar" sin red se
 * fusiona en la última intención en vez de mandar dos requests. Generar con
 * IA sigue siendo solo en línea: necesita el modelo del servidor.
 */
type ObservacionPayload =
  | ({ accion: "guardar" } & GuardarObservacionInput)
  | ({ accion: "eliminar" } & EliminarObservacionInput)

export const OBSERVACION_INFORME_KIND = "informe.observacion"

export function observacionEntityKey(matriculaId: number, periodoId: number | null) {
  return `informe:observacion:${matriculaId}:${periodoId ?? "final"}`
}

registerOutboxHandler<ObservacionPayload>({
  kind: OBSERVACION_INFORME_KIND,
  version: 1,
  entityKey: (p) => observacionEntityKey(p.matriculaId, p.periodoId),
  // Solo cuenta la última intención del docente sobre esa observación.
  coalesce: (_prev, next) => next,
  send: (p) => (p.accion === "guardar" ? enviarGuardarObservacion(p) : enviarEliminarObservacion(p)),
  invalidates: () => [informeGrupoQueryKeyPrefix()],
  describe: (p) => ({
    titulo: p.accion === "guardar" ? "Observación del informe" : "Eliminar observación del informe",
    detalle: `Matrícula ${p.matriculaId} · ${p.periodoId === null ? "Final" : `período ${p.periodoId}`}`,
    ruta: "/app/gestion-academica/informes",
  }),
})

export interface ObservacionResultado {
  /** Quedó en la outbox (sin red): el llamador muestra `QUEUED_MESSAGE`. */
  queued: boolean
}

async function guardarObservacion(input: GuardarObservacionInput): Promise<ObservacionResultado> {
  const outcome = await runOrQueue<ObservacionPayload>(OBSERVACION_INFORME_KIND, { accion: "guardar", ...input })
  return { queued: outcome.queued }
}

async function eliminarObservacion(input: EliminarObservacionInput): Promise<ObservacionResultado> {
  const outcome = await runOrQueue<ObservacionPayload>(OBSERVACION_INFORME_KIND, { accion: "eliminar", ...input })
  return { queued: outcome.queued }
}

export function useGenerarObservacionMutation({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof generarObservacion> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: generarObservacion,
    // A diferencia del viejo `/informes/observacion/generar`, este endpoint
    // ya guarda: sin invalidar, la tabla de atrás sigue mostrando el estado
    // previo hasta el próximo refetch.
    onSuccess: (result, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: informeGrupoQueryKeyPrefix() })
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}

export function useGuardarObservacionMutation({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof guardarObservacion> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: guardarObservacion,
    networkMode: "always",
    onSuccess: (result, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: informeGrupoQueryKeyPrefix() })
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}

export function useEliminarObservacionMutation({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof eliminarObservacion> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: eliminarObservacion,
    networkMode: "always",
    onSuccess: (result, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: informeGrupoQueryKeyPrefix() })
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}
