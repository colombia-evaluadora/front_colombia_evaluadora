import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { runOrQueue } from "@/lib/offline/outbox/engine"
import { registerOutboxHandler } from "@/lib/offline/outbox/registry"
import type { SendCtx } from "@/lib/offline/outbox/types"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { invalidarCalificacionesActividad } from "@/features/planeador/api/mutations/invalidar-calificaciones"

/**
 * `PUT /planeador/actividades/estudiantes/:id/calificar` (confirmado real,
 * ver colección Postman `planeador-planilla-flujo-completo`, paso 4.1).
 *
 * Dos precondiciones reales que hay que respetar al armar el input:
 * 1. Para RUBRICA, `niveles` debe cubrir TODOS los criterios activos del
 *    instrumento — parcial da 400 ("La rubrica tiene N criterio(s) activo(s)
 *    pero se calificaron M"). Se valida antes de mutar en
 *    `instrumento-grading-fields.tsx` (`instrumentoCompletitud`).
 * 2. Tiene que haber asistencia registrada para `fecha` — si no, 400. No hay
 *    forma de validarlo desde el front sin otro endpoint; el error del
 *    backend se muestra tal cual en el toast.
 */
export type CalificarCeldaInput = {
  pkTactividadEstudiante: number
  /** Actividad de la celda: si se pasa, solo se invalidan sus calificaciones
   *  (X2); si no, las de todas las actividades en cache. */
  actividadId?: number
  /** `yyyy-MM-dd` — la fecha de la actividad (`PlanillaColumna.fechaInicio`). */
  fecha: string
} & (
  | { tipo: "RUBRICA"; niveles: { pkCriterio: number; pkNivel: number }[] }
  | { tipo: "LISTA_COTEJO"; itemsMarcados: number[] }
  | { tipo: "ESCALA_CUALITATIVA"; pkNivel: number }
  | { tipo: "VALOR_NUMERICO"; valorNumerico: number }
  | {
      tipo: "ESCALA_CRITERIOS"
      criterios: ({ criterioIndex: number } & ({ pkNivel: number } | { valorNumerico: number }))[]
    }
  /** "Otro" SIN método de valoración configurado — texto libre real,
   *  `fn_actividad_nota_calificar_otro` espera `{porcentaje}`, una clave
   *  DISTINTA de `valorNumerico` (esa es de la escala numérica). */
  | { tipo: "OTRO_PORCENTAJE"; porcentaje: number }
)

export function buildCalificacion(input: CalificarCeldaInput): unknown {
  switch (input.tipo) {
    case "RUBRICA":
      return { niveles: input.niveles }
    // Confirmado real contra `instrumentos-por-tipo-evaluacion.md` (§5,
    // tabla de payloads de PUT .../calificar): `{"itemsMarcados":[pk,…]}`,
    // solo los pk de los ítems marcados -- NO `{items:[{pkItem,cumplido}]}`
    // (lo que mandaba este archivo antes). Con la forma vieja el backend no
    // reconocía el campo `items` y la lista de cotejo no se guardaba.
    case "LISTA_COTEJO":
      return { itemsMarcados: input.itemsMarcados }
    case "ESCALA_CUALITATIVA":
      return { pkNivel: input.pkNivel }
    case "VALOR_NUMERICO":
      return { valorNumerico: input.valorNumerico }
    // Un valor POR criterio general de la escala (V472,
    // fn_actividad_nota_calificar_escala_criterios) -- la fachada del
    // backend (fn_actividad_nota_calificar) despacha acá SOLO si el body
    // trae la clave "criterios"; sin ella sigue el camino de siempre
    // (ESCALA_CUALITATIVA/VALOR_NUMERICO arriba).
    case "ESCALA_CRITERIOS":
      return { criterios: input.criterios }
    case "OTRO_PORCENTAJE":
      return { porcentaje: input.porcentaje }
  }
}

export interface CalificarCeldaResult {
  calificacion: number | null
  /** Regla 55: corrección en periodo no calificable → solicitud de
   *  aprobación (la nota no cambia). Vacío = se aplicó. */
  solicitudes_pendientes?: number[] | null
  /** `true` = quedó en la outbox (sin conexión); se enviará al reconectar. */
  queued?: boolean
}

/** Op de la outbox: el body ya armado (`CALIFICACION` serializado). */
export interface CalificarPayload {
  pkTactividadEstudiante: number
  actividadId?: number
  CALIFICACION: string
  FECHA: string
  /** `updated_at` de la celda que vio el docente (CAS, BE-2). */
  baseVersion?: string | null
  /** Para reabrir el popover con lo encolado. */
  input: CalificarCeldaInput
}

/** Todas las escrituras de una celda comparten entidad: FIFO entre calificar/observar/estado. */
export const celdaEntityKey = (pk: number) => `planilla:act-est:${pk}`

export const PLANILLA_SOLICITUD_NOTE =
  "El periodo se cerró antes de sincronizar: tus cambios quedaron como solicitud al coordinador."

function sendCalificar(p: CalificarPayload, ctx: SendCtx): Promise<CalificarCeldaResult> {
  return evalCol.putRow(
    `/planeador/actividades/estudiantes/${p.pkTactividadEstudiante}/calificar`,
    // `CALIFICACION` está declarado JSONB del lado del backend y espera un
    // STRING ya serializado, no un objeto anidado nativo — mandarlo como
    // objeto lo aplana en "placeholders sin tipo declarado" (400). Mismo bug
    // de binder que `DEFINICION` en `PUT .../instrumento`.
    // `BASE_VERSION` solo si se conoce: sin él, el backend escribe como siempre.
    { CALIFICACION: p.CALIFICACION, FECHA: p.FECHA, ...(p.baseVersion ? { BASE_VERSION: p.baseVersion } : {}) },
    { headers: { "Idempotency-Key": ctx.idempotencyKey }, background: ctx.background },
  )
}

registerOutboxHandler<CalificarPayload>({
  kind: "planilla.calificar",
  version: 1,
  entityKey: (p) => celdaEntityKey(p.pkTactividadEstudiante),
  // Dos ediciones de la misma celda: gana la última, con la BASE de la primera (§6.7).
  coalesce: (prev, next) => ({ ...next, baseVersion: prev.baseVersion ?? next.baseVersion }),
  send: sendCalificar,
  noteOf: (r) => ((r as CalificarCeldaResult)?.solicitudes_pendientes?.length ? PLANILLA_SOLICITUD_NOTE : null),
  invalidates: (p) => [
    planeadorKeys.planilla.calificaciones.all,
    ["informes"],
    planeadorKeys.actividadEstudiante.nota(p.pkTactividadEstudiante),
    p.actividadId != null ? planeadorKeys.actividad.calificaciones(p.actividadId) : ["planeador", "actividad"],
  ],
  rebase: (p, conflict) => ({ ...p, baseVersion: conflict.serverVersion ?? null }),
  describe: (p) => ({
    titulo: "Calificación",
    detalle: `Actividad ${p.actividadId ?? "—"}, fecha ${p.FECHA}`,
    ruta: "/app/planeador/planilla",
  }),
})

type CalificarCeldaVars = CalificarCeldaInput & { baseVersion?: string | null }

async function calificarCelda({ baseVersion, ...input }: CalificarCeldaVars): Promise<CalificarCeldaResult> {
  const outcome = await runOrQueue<CalificarPayload, CalificarCeldaResult>("planilla.calificar", {
    pkTactividadEstudiante: input.pkTactividadEstudiante,
    actividadId: input.actividadId,
    CALIFICACION: JSON.stringify(buildCalificacion(input)),
    FECHA: input.fecha,
    baseVersion: baseVersion ?? null,
    input,
  })
  return outcome.queued ? { calificacion: null, queued: true } : outcome.result
}

interface UseCalificarCeldaOptions {
  mutationConfig?: MutationConfig<typeof calificarCelda>
}

export function useCalificarCeldaMutation({ mutationConfig }: UseCalificarCeldaOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: calificarCelda,
    // La outbox decide si hay red: la mutación no debe quedar pausada.
    networkMode: "always",
    onSuccess: (result, variables, ...rest) => {
      // Encolada: se invalida al sincronizar (invalidación agrupada del lote).
      if (!result.queued) {
        queryClient.invalidateQueries({ queryKey: planeadorKeys.planilla.calificaciones.all })
        // Alertas y planilla de Informes: la nota cambia la definitiva o abre una solicitud.
        queryClient.invalidateQueries({ queryKey: ["informes"] })
        queryClient.invalidateQueries({
          queryKey: planeadorKeys.actividadEstudiante.nota(variables.pkTactividadEstudiante),
        })
        invalidarCalificacionesActividad(queryClient, variables.actividadId)
      }
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}
