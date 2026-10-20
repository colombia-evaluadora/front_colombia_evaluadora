import { outboxHeaders } from "@/lib/offline/outbox/headers"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"
import type { MutationConfig } from "@/lib/react-query"
import { runOrQueue } from "@/lib/offline/outbox/engine"
import { registerOutboxHandler } from "@/lib/offline/outbox/registry"
import type { SendCtx } from "@/lib/offline/outbox/types"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { evidenciasInformeAllKey } from "@/features/academic-management/reports/api/query/use-evidencias-informe-query"

/** Adjuntar/quitar UNA evidencia sin tocar las demás (V461). */
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

/** Va por file-service, que sube el binario y reemplaza `FK_TARCHIVO` por su pk.
 *  En la outbox el archivo viaja como blob (clave `archivo`). */
interface AgregarSoportePayload {
  pkTactividadEstudiante: number
  fecha: string
  nombre: string
}

const soporteKeys = (pk: number) => [
  planeadorKeys.planilla.calificaciones.all,
  planeadorKeys.actividadEstudiante.nota(pk),
  planeadorKeys.actividadEstudiante.soportes(pk),
]

registerOutboxHandler<AgregarSoportePayload>({
  kind: "planilla.soporte",
  version: 1,
  // Misma entidad que calificar/observar: FIFO por celda.
  entityKey: (p) => `planilla:act-est:${p.pkTactividadEstudiante}`,
  async send(p: AgregarSoportePayload, ctx: SendCtx) {
    // Multipart sin Idempotency-Key: una respuesta perdida puede duplicar el adjunto.
    const respuesta = await postMultipart<RowsEnvelope<SoporteRow> | SoporteRow>(
      `/eval-col/planeador/actividades/estudiantes/${p.pkTactividadEstudiante}/soportes`,
      { FECHA: p.fecha },
      { FK_TARCHIVO: await ctx.getFile("archivo") },
      { background: ctx.background },
    )
    return unwrapRow<SoporteRow>(respuesta).pk_tactividad_soporte
  },
  invalidates: (p) => soporteKeys(p.pkTactividadEstudiante),
  describe: (p) => ({ titulo: "Evidencia de observación", detalle: p.nombre, ruta: "/app/planeador/planilla" }),
})

registerOutboxHandler<QuitarSoporteInput>({
  kind: "planilla.soporte-quitar",
  version: 1,
  entityKey: (p) => `planilla:act-est:${p.pkTactividadEstudiante}`,
  send: (input: QuitarSoporteInput, ctx: SendCtx) =>
    evalCol.putRow<SoporteRow>(
      `/planeador/actividades/estudiantes/soportes/${input.pkTactividadSoporte}`,
      { FECHA: input.fecha },
      { headers: outboxHeaders(ctx), background: ctx.background },
    ),
  invalidates: (p) => soporteKeys(p.pkTactividadEstudiante),
  describe: () => ({ titulo: "Quitar evidencia de observación", detalle: "", ruta: "/app/planeador/planilla" }),
})

registerOutboxHandler<MarcarFavoritoSoporteInput>({
  kind: "planilla.soporte-favorito",
  version: 1,
  entityKey: (p) => `planilla:act-est:${p.pkTactividadEstudiante}`,
  coalesce: (_prev, next) => next,
  send: (input: MarcarFavoritoSoporteInput, ctx: SendCtx) =>
    evalCol.putRow<SoporteRow>(
      `/planeador/actividades/estudiantes/soportes/${input.pkTactividadSoporte}/favorito`,
      { ES_FAVORITO: input.esFavorito },
      { headers: outboxHeaders(ctx), background: ctx.background },
    ),
  invalidates: (p) => [
    planeadorKeys.actividadEstudiante.soportes(p.pkTactividadEstudiante),
    evidenciasInformeAllKey,
  ],
  describe: (p) => ({
    titulo: p.esFavorito ? "Marcar evidencia favorita" : "Quitar evidencia favorita",
    detalle: "",
    ruta: "/app/planeador/planilla",
  }),
})

/** `pk_tactividad_soporte`, o `null` si quedó en la outbox (sin conexión). */
async function agregarObservacionSoporte(input: AgregarSoporteInput): Promise<number | null> {
  const outcome = await runOrQueue<AgregarSoportePayload, number>(
    "planilla.soporte",
    { pkTactividadEstudiante: input.pkTactividadEstudiante, fecha: input.fecha, nombre: input.archivo.name },
    { files: { archivo: input.archivo } },
  )
  return outcome.queued ? null : outcome.result
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
    networkMode: "always",
    onSuccess: (result, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: planeadorKeys.planilla.calificaciones.all })
      queryClient.invalidateQueries({
        queryKey: planeadorKeys.actividadEstudiante.nota(variables.pkTactividadEstudiante),
      })
      queryClient.invalidateQueries({
        queryKey: planeadorKeys.actividadEstudiante.soportes(variables.pkTactividadEstudiante),
      })
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}

export interface QuitarSoporteInput {
  pkTactividadSoporte: number
  /** Solo para invalidar; el endpoint no lo recibe. */
  pkTactividadEstudiante: number
  /** `yyyy-MM-dd`, mismo gate de asistencia que agregar/observar. */
  fecha: string
}

async function quitarObservacionSoporte(input: QuitarSoporteInput): Promise<{ queued: boolean }> {
  const outcome = await runOrQueue("planilla.soporte-quitar", input)
  return { queued: outcome.queued }
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
    networkMode: "always",
    onSuccess: (result, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: planeadorKeys.planilla.calificaciones.all })
      queryClient.invalidateQueries({
        queryKey: planeadorKeys.actividadEstudiante.nota(variables.pkTactividadEstudiante),
      })
      queryClient.invalidateQueries({
        queryKey: planeadorKeys.actividadEstudiante.soportes(variables.pkTactividadEstudiante),
      })
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}

export interface MarcarFavoritoSoporteInput {
  pkTactividadSoporte: number
  /** Para invalidar los soportes de ESE estudiante. */
  pkTactividadEstudiante: number
  /** `true` marca esta y desmarca la anterior; `false` la desmarca. */
  esFavorito: boolean
}

/** No exige asistencia: solo cambia cuál evidencia se destaca. */
async function marcarFavoritoSoporte(input: MarcarFavoritoSoporteInput): Promise<{ queued: boolean }> {
  const outcome = await runOrQueue("planilla.soporte-favorito", input)
  return { queued: outcome.queued }
}

/** Una sola en vuelo por estudiante: dos a la vez chocan con el índice único (23505). */
export const favoritoMutationKey = (pkTactividadEstudiante: number) =>
  [...planeadorKeys.actividadEstudiante.soportes(pkTactividadEstudiante), "favorito"] as const

interface UseMarcarFavoritoSoporteOptions {
  pkTactividadEstudiante: number
  mutationConfig?: MutationConfig<typeof marcarFavoritoSoporte>
}

export function useMarcarFavoritoSoporteMutation({
  pkTactividadEstudiante,
  mutationConfig,
}: UseMarcarFavoritoSoporteOptions) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationKey: favoritoMutationKey(pkTactividadEstudiante),
    mutationFn: marcarFavoritoSoporte,
    networkMode: "always",
    onSuccess: (result, variables, ...rest) => {
      queryClient.invalidateQueries({
        queryKey: planeadorKeys.actividadEstudiante.soportes(variables.pkTactividadEstudiante),
      })
      queryClient.invalidateQueries({ queryKey: evidenciasInformeAllKey })
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}
