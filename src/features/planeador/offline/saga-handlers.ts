/**
 * Pasos de las sagas del planeador como handlers de la outbox (Fase 3,
 * `docs/offline/PLAN-offline.md` §6.5–6.8). Cada paso reusa la MISMA función
 * de escritura que el guardado online (`api/mutations/*`), con la
 * `Idempotency-Key` fija del paso y sus archivos desde el store `blobs`.
 *
 * Orden real (P19, ver `design.md` D-F3-2):
 * - crear: actividad → materiales → instrumento → adaptaciones → criterios
 *   (hermanos, solo dependen de la actividad).
 * - editar: unidad (vincular/desvincular) → PUT actividad (con evidencias y
 *   criterios) → materiales → instrumento → estudiantes → adaptaciones.
 *   El instrumento va después del PUT porque necesita
 *   `FK_TLV_INSTRUMENTO_EVALUACION` ya fijado (si no, 400/22023).
 */
import Axios from "axios"

import { getErrorMessage } from "@/lib/api-client"
import { queryClient } from "@/lib/query-client"
import { registerOutboxHandler } from "@/lib/offline/outbox/registry"
import {
  resolveId,
  SagaParentMissingError,
  sagaOf,
  setMappedId,
  stepRequest,
  type SagaPayload,
} from "@/lib/offline/outbox/saga"
import { isTmpId, TmpIdLeakError, type TmpId } from "@/lib/offline/outbox/tmp-id"
import type { ClassifiedError, OutboxConflict, OutboxHandler, SendCtx } from "@/lib/offline/outbox/types"

import { createActividad } from "@/features/planeador/api/mutations/create-actividad"
import { updateActividad } from "@/features/planeador/api/mutations/update-actividad"
import { linkActividadUnidad } from "@/features/planeador/api/mutations/link-actividad-unidad"
import { unlinkActividadUnidad } from "@/features/planeador/api/mutations/unlink-actividad-unidad"
import { updateMaterialesActividad } from "@/features/planeador/api/mutations/update-materiales-actividad"
import { updateInstrumentoActividad } from "@/features/planeador/api/mutations/update-instrumento-actividad"
import { updateAdaptacionesActividad } from "@/features/planeador/api/mutations/update-adaptaciones-actividad"
import { agregarCriterioUnidadActividad } from "@/features/planeador/api/mutations/agregar-criterio-unidad-actividad"
import { setEstudiantesActividad } from "@/features/planeador/api/mutations/set-estudiantes-actividad"
import { createUnidad } from "@/features/planeador/api/mutations/create-unidad"
import { updateUnidad, type UnidadInfoGeneral } from "@/features/planeador/api/mutations/update-unidad"
import { fetchActividadDetalle } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { fetchUnidadDetalle } from "@/features/planeador/api/query/use-unidades-query"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import type { Actividad, Adaptacion, InstrumentoPermitido, Recurso } from "@/features/planeador/api/types/actividad"
import { motivoNoEditable } from "@/features/planeador/lib/actividad-editable"
import { fingerprintActividad, fingerprintUnidad } from "@/features/planeador/offline/fingerprint"

export const SAGA_KINDS = {
  actividadCrear: "planeador.actividad.crear",
  actividadUnidad: "planeador.actividad.unidad",
  actividadEditar: "planeador.actividad.editar",
  actividadMateriales: "planeador.actividad.materiales",
  actividadInstrumento: "planeador.actividad.instrumento",
  actividadEstudiantes: "planeador.actividad.estudiantes",
  actividadAdaptaciones: "planeador.actividad.adaptaciones",
  actividadCriterio: "planeador.actividad.criterio",
  unidadCrear: "planeador.unidad.crear",
  unidadEditar: "planeador.unidad.editar",
} as const

type Id = number | TmpId

/** Verificación contra la versión del servidor (primer paso de una edición encolada). */
export interface VersionCheck {
  /** Huella del detalle que vio el docente al abrir el formulario. */
  baseFingerprint: string
}

// ---- Errores propios (clasificación estable, D-F3-5) -------------------------

export const PLANEADOR_ERROR_CODES = {
  noEditable: "ACTIVIDAD_NO_EDITABLE",
  periodoCerrado: "PERIODO_CERRADO",
  conflicto: "OFFLINE_CONFLICT",
  pasoPrevio: "SAGA_PASO_PREVIO",
} as const

export class SagaStepRejected extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = "SagaStepRejected"
    this.code = code
  }
}

export class SagaStepConflict extends Error {
  readonly serverVersion: string
  readonly server: unknown
  constructor(message: string, serverVersion: string, server: unknown) {
    super(message)
    this.name = "SagaStepConflict"
    this.serverVersion = serverVersion
    this.server = server
  }
}

const PERIODO_CERRADO_RE = /periodo[^.]*(cerrad|no est[aá] abierto|ya no es calificable|fuera del periodo)/i
const NO_EDITABLE_RE = /(calificaciones u observaciones registradas|ya tiene resultados|base de una recuperaci[oó]n|no (se )?puede(s)? editar esta actividad)/i

/**
 * Clasificación de los pasos: los rechazos de negocio que el docente debe
 * leer (regla 37, periodo cerrado) salen con código estable y el motivo del
 * backend; el resto cae en la clasificación por defecto de la outbox.
 */
export function classifyPlaneadorStep(error: unknown): ClassifiedError | null {
  if (error instanceof SagaStepRejected) return { kind: "rejected", error: { code: error.code, message: error.message } }
  if (error instanceof SagaStepConflict) {
    const conflict: OutboxConflict = { server: error.server, serverVersion: error.serverVersion }
    return { kind: "conflict", conflict, error: { code: PLANEADOR_ERROR_CODES.conflicto, status: 409, message: error.message } }
  }
  if (error instanceof SagaParentMissingError || error instanceof TmpIdLeakError) {
    return { kind: "rejected", error: { code: PLANEADOR_ERROR_CODES.pasoPrevio, message: error.message } }
  }
  if (Axios.isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500) {
    const status = error.response.status
    if ([401, 404, 409, 429].includes(status)) return null
    const data = error.response.data as { code?: string } | undefined
    const message = getErrorMessage(error)
    if (data?.code === PLANEADOR_ERROR_CODES.periodoCerrado || PERIODO_CERRADO_RE.test(message)) {
      return { kind: "rejected", error: { code: PLANEADOR_ERROR_CODES.periodoCerrado, status, message } }
    }
    if (NO_EDITABLE_RE.test(message)) {
      return { kind: "rejected", error: { code: PLANEADOR_ERROR_CODES.noEditable, status, message } }
    }
    // Validación de negocio del planeador: el motivo real del backend.
    if (status !== 403) return { kind: "rejected", error: { code: `http-${status}`, status, message } }
  }
  return null
}

// ---- Verificación contra el servidor ------------------------------------------------

/**
 * Antes del primer paso de una edición ENCOLADA: refetch del detalle (el
 * reemplazo total de materiales/adaptaciones necesita la foto actual, §6.8) y
 * - regla 37 (con calificaciones u observaciones) → rechazado con el motivo;
 * - el detalle cambió desde que el docente lo abrió → conflicto.
 * Online (`background: false`) no se verifica: el docente acaba de ver la
 * versión vigente (mismo comportamiento que antes de la Fase 3).
 */
async function verificarActividad(actividadId: number, check: VersionCheck | undefined, ctx: SendCtx) {
  if (!check || !ctx.background) return
  const detalle = await fetchActividadDetalle(actividadId, queryClient)
  const motivo = motivoNoEditable(detalle)
  if (motivo) throw new SagaStepRejected(PLANEADOR_ERROR_CODES.noEditable, motivo)
  const actual = fingerprintActividad(detalle)
  if (actual !== check.baseFingerprint) {
    throw new SagaStepConflict(
      "La actividad cambió en el servidor mientras estabas sin conexión.",
      actual,
      { titulo: detalle.nombre },
    )
  }
}

async function verificarUnidad(unidadId: number, check: VersionCheck | undefined, ctx: SendCtx) {
  if (!check || !ctx.background) return
  const detalle = await fetchUnidadDetalle(unidadId)
  const actual = fingerprintUnidad(detalle)
  if (actual !== check.baseFingerprint) {
    throw new SagaStepConflict(
      "La unidad cambió en el servidor mientras estabas sin conexión (por ejemplo, su método de cálculo).",
      actual,
      { nombre: detalle.nombre },
    )
  }
}

/** "Conservar el mío": la verificación pasa a compararse con la versión actual del servidor. */
function rebaseCheck<P extends { check?: VersionCheck }>(payload: P, conflict: OutboxConflict): P {
  if (!payload.check || !conflict.serverVersion) return payload
  return { ...payload, check: { baseFingerprint: conflict.serverVersion } }
}

// ---- Registro ------------------------------------------------------------------------

const INVALIDA = [
  planeadorKeys.actividades.all,
  planeadorKeys.actividad.all,
  planeadorKeys.unidad.all,
  planeadorKeys.unidades.all,
  planeadorKeys.unidades.tabs(),
]

function step<P extends SagaPayload>(
  kind: string,
  send: (payload: P, ctx: SendCtx) => Promise<unknown>,
  extra: Partial<OutboxHandler<P>> = {},
): OutboxHandler<P> {
  return registerOutboxHandler<P>({
    kind,
    version: 1,
    // Clave única por paso: el orden lo dan los `dependsOn` de la saga, no el FIFO.
    entityKey: (p) => `planeador:saga:${p.saga.id}:${p.saga.step}`,
    send,
    classify: classifyPlaneadorStep,
    invalidates: () => INVALIDA,
    describe: (p) => ({
      titulo: p.saga.titulo,
      detalle: `Paso ${p.saga.step + 1} de ${p.saga.total}: ${p.saga.label}`,
      ruta: p.saga.target.startsWith("unidad:") ? "/app/planeador/unidades" : "/app/planeador",
    }),
    ...extra,
  })
}

export interface ActividadCrearPayload extends SagaPayload {
  tmpId: TmpId
  actividad: Actividad
}
step<ActividadCrearPayload>(SAGA_KINDS.actividadCrear, async (p, ctx) => {
  // Idempotente: si un intento anterior ya creó la actividad (respuesta
  // perdida), la `Idempotency-Key` del gateway repite la misma respuesta.
  const unidadId = p.actividad.unidad?.id as unknown as Id
  const actividad = isTmpId(unidadId)
    ? { ...p.actividad, unidad: { ...p.actividad.unidad, id: await resolveId(unidadId) } }
    : p.actividad
  const { id } = await createActividad(actividad, stepRequest(ctx))
  await setMappedId(p.tmpId, id)
  return { id }
})

export interface ActividadUnidadPayload extends SagaPayload {
  actividadId: Id
  check?: VersionCheck
  /** `null` = desvincular. */
  link: {
    unidadId: Id
    ponderacion: number
    omitirPonderacion?: boolean
    permitirMoverDeUnidad?: boolean
  } | null
}
step<ActividadUnidadPayload>(
  SAGA_KINDS.actividadUnidad,
  async (p, ctx) => {
    const actividadId = await resolveId(p.actividadId)
    await verificarActividad(actividadId, p.check, ctx)
    if (!p.link) return unlinkActividadUnidad(actividadId, stepRequest(ctx))
    return linkActividadUnidad({ ...p.link, actividadId, unidadId: await resolveId(p.link.unidadId) }, stepRequest(ctx))
  },
  { rebase: rebaseCheck },
)

export interface ActividadEditarPayload extends SagaPayload {
  actividadId: Id
  data: Actividad
  check?: VersionCheck
}
step<ActividadEditarPayload>(
  SAGA_KINDS.actividadEditar,
  async (p, ctx) => {
    const actividadId = await resolveId(p.actividadId)
    await verificarActividad(actividadId, p.check, ctx)
    return updateActividad({ actividadId, data: p.data }, stepRequest(ctx))
  },
  { rebase: rebaseCheck },
)

export interface ActividadMaterialesPayload extends SagaPayload {
  actividadId: Id
  recursos: Recurso[]
}
step<ActividadMaterialesPayload>(SAGA_KINDS.actividadMateriales, async (p, ctx) =>
  updateMaterialesActividad({ actividadId: await resolveId(p.actividadId), recursos: p.recursos }, stepRequest(ctx)),
  {
    noteOf: (result) => {
      const omitidos = (result as { recursosOmitidos?: string[] } | null)?.recursosOmitidos ?? []
      return omitidos.length > 0 ? `No se guardaron materiales sin archivo: ${omitidos.join(", ")}.` : null
    },
  },
)

export interface ActividadInstrumentoPayload extends SagaPayload {
  actividadId: Id
  actividad: Actividad
  instrumentosPermitidos?: InstrumentoPermitido[]
}
step<ActividadInstrumentoPayload>(SAGA_KINDS.actividadInstrumento, async (p, ctx) =>
  updateInstrumentoActividad(
    { actividadId: await resolveId(p.actividadId), actividad: p.actividad, instrumentosPermitidos: p.instrumentosPermitidos },
    stepRequest(ctx),
  ),
)

export interface ActividadEstudiantesPayload extends SagaPayload {
  actividadId: Id
  matriculasIds: number[]
  asignarTodoElGrupo: boolean
}
step<ActividadEstudiantesPayload>(SAGA_KINDS.actividadEstudiantes, async (p, ctx) =>
  setEstudiantesActividad(
    { actividadId: await resolveId(p.actividadId), matriculasIds: p.matriculasIds, asignarTodoElGrupo: p.asignarTodoElGrupo },
    stepRequest(ctx),
  ),
)

export interface ActividadAdaptacionesPayload extends SagaPayload {
  actividadId: Id
  adaptaciones: Adaptacion[]
}
step<ActividadAdaptacionesPayload>(SAGA_KINDS.actividadAdaptaciones, async (p, ctx) =>
  updateAdaptacionesActividad({ actividadId: await resolveId(p.actividadId), adaptaciones: p.adaptaciones }, stepRequest(ctx)),
)

export interface ActividadCriterioPayload extends SagaPayload {
  actividadId: Id
  criterioUnidadId: number
}
step<ActividadCriterioPayload>(SAGA_KINDS.actividadCriterio, async (p, ctx) =>
  agregarCriterioUnidadActividad(
    { actividadId: await resolveId(p.actividadId), criterioUnidadId: p.criterioUnidadId },
    stepRequest(ctx),
  ),
)

export interface UnidadCrearPayload extends SagaPayload {
  tmpId: TmpId
  data: UnidadInfoGeneral
}
step<UnidadCrearPayload>(SAGA_KINDS.unidadCrear, async (p, ctx) => {
  const { id } = await createUnidad(p.data, stepRequest(ctx))
  await setMappedId(p.tmpId, id)
  return { id }
})

export interface UnidadEditarPayload extends SagaPayload {
  unidadId: Id
  data: UnidadInfoGeneral
  check?: VersionCheck
}
step<UnidadEditarPayload>(
  SAGA_KINDS.unidadEditar,
  async (p, ctx) => {
    const unidadId = await resolveId(p.unidadId)
    await verificarUnidad(unidadId, p.check, ctx)
    const result = await updateUnidad({ unidadId, data: p.data }, stepRequest(ctx))
    if (result.status === "error") throw new SagaStepRejected("http-400", result.message ?? "El servidor rechazó el cambio.")
    return result
  },
  {
    rebase: rebaseCheck,
    noteOf: (result) => {
      const afectadas = (result as { actividadesAfectadas?: { titulo: string }[] } | null)?.actividadesAfectadas ?? []
      return afectadas.length > 0 ? `Se convirtió el peso/puntaje de: ${afectadas.map((a) => a.titulo).join(", ")}.` : null
    },
  },
)

/** Para tests y para la UI: ¿esta op es un paso de saga del planeador? */
export function isPlaneadorSagaOp(op: { kind: string; payload: unknown }): boolean {
  return Object.values(SAGA_KINDS).includes(op.kind as never) && sagaOf(op) != null
}

