import { outboxHeaders } from "@/lib/offline/outbox/headers"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { postMultipart } from "@/lib/files"
import { runOrQueue } from "@/lib/offline/outbox/engine"
import { registerOutboxHandler } from "@/lib/offline/outbox/registry"
import type { SendCtx } from "@/lib/offline/outbox/types"

import { invalidarPlaneadorPorAsistencia } from "@/features/planeador/api/query/invalidar-por-asistencia"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

import type {
  AsistenciaRegistrarRequest,
  AsistenciaRegistroManual,
} from "@/features/academic-management/asistencia/api/types/asistencia"
import { asistenciaKeys } from "@/features/academic-management/asistencia/api/query-keys"

interface SubirSoporteResponse {
  pk_tarchivo: number
}

export async function subirSoporte(file: File, background = false): Promise<number> {
  const raw = await postMultipart<{ rows: SubirSoporteResponse[] } | SubirSoporteResponse>(
    "/eval-col/asistencias/soporte",
    {},
    { SOPORTE: file },
    { background },
  )
  const fila = "rows" in raw ? raw.rows[0] : raw
  return fila.pk_tarchivo
}

interface RegistrarResponse {
  registros_afectados: number
  /** Regla 75: en período no calificable no se escribe; vienen las solicitudes abiertas. */
  solicitudes_pendientes?: number[]
}

export interface RegistrarResultado {
  /** Filas escritas; 0 en período cerrado o si "marcar todos" no encontró a nadie sin asistencia. */
  afectados: number
  /** Solicitudes abiertas; vacío = se guardó directo. */
  pendientes: number[]
  /** `true` = quedó en la outbox (sin conexión); se enviará al reconectar. */
  queued?: boolean
}

/** Registro serializable para la outbox: el archivo va por clave (`fileKey`). */
type RegistroCola = Omit<AsistenciaRegistroManual, "fkArchivo"> & {
  fkArchivo?: number | string
  /** `updated_at` del registro que vio el docente (CAS por estudiante, BE-5). */
  baseVersion?: string | null
}

export type RegistrarPayload = Omit<AsistenciaRegistrarRequest, "REGISTROS"> & { REGISTROS?: RegistroCola[] }

export const PERIODO_SOLICITUD_NOTE =
  "El periodo se cerró antes de sincronizar: tus cambios quedaron como solicitud al coordinador."

/** Sesión de asistencia: (grupo, contexto, fecha, bloque) — FIFO de la outbox. */
export function sesionEntityKey(
  p: Pick<AsistenciaRegistrarRequest, "GRUPO" | "ASIGNATURA" | "ACTIVIDAD" | "FECHA" | "BLOQUE">,
) {
  const ctx = p.ACTIVIDAD != null ? `act${p.ACTIVIDAD}` : `asig${p.ASIGNATURA}`
  return `asistencia:sesion:${p.GRUPO}:${ctx}:${p.FECHA}:${p.BLOQUE ?? 0}`
}

async function sendRegistrar(payload: RegistrarPayload, ctx: SendCtx): Promise<RegistrarResultado> {
  const REGISTROS = payload.REGISTROS
    ? await Promise.all(
        payload.REGISTROS.map(async ({ baseVersion, ...r }) => ({
          ...r,
          ...(typeof r.fkArchivo === "string" ? { fkArchivo: await ctx.resolveFile(r.fkArchivo) } : {}),
          // Solo cuando se conoce: sin él, el backend hace el upsert de siempre.
          ...(baseVersion ? { baseVersion } : {}),
        })),
      )
    : undefined
  const raw = await api.post<RegistrarResponse | RegistrarResponse[] | number>(
    "/eval-col/asistencias/registrar",
    { ...payload, REGISTROS },
    { headers: outboxHeaders(ctx), background: ctx.background },
  )
  if (typeof raw === "number") return { afectados: raw, pendientes: [] }
  const fila = Array.isArray(raw) ? raw[0] : raw
  return { afectados: Number(fila?.registros_afectados ?? 0), pendientes: fila?.solicitudes_pendientes ?? [] }
}

const ASISTENCIA_KEYS = [["asistencia"], planeadorKeys.planilla.calificaciones.all, ["planeador", "actividad"]] as const

const describeSesion = (p: RegistrarPayload) => `Sesión del ${p.FECHA}${p.BLOQUE ? `, bloque ${p.BLOQUE}` : ""}`

registerOutboxHandler<RegistrarPayload>({
  kind: "asistencia.registrar",
  version: 1,
  entityKey: sesionEntityKey,
  // Mismo bloque: el último `REGISTROS` por estudiante gana (§6.7), conservando
  // la versión base de la primera captura (lo que vio el docente).
  coalesce: (prev, next) => {
    const porEstudiante = new Map((prev.REGISTROS ?? []).map((r) => [r.fkMatricula, r]))
    for (const r of next.REGISTROS ?? []) {
      porEstudiante.set(r.fkMatricula, {
        ...r,
        baseVersion: porEstudiante.get(r.fkMatricula)?.baseVersion ?? r.baseVersion,
      })
    }
    return { ...next, REGISTROS: [...porEstudiante.values()] }
  },
  send: sendRegistrar,
  upload: (file, background) => subirSoporte(file, background),
  noteOf: (r) => ((r as RegistrarResultado)?.pendientes?.length ? PERIODO_SOLICITUD_NOTE : null),
  invalidates: () => ASISTENCIA_KEYS,
  // "Conservar el mío" por estudiante: se reenvía sobre la versión del servidor.
  rebase: (payload, conflict) => ({
    ...payload,
    REGISTROS: payload.REGISTROS?.map((r) => ({
      ...r,
      baseVersion: conflict.rows?.find((c) => c.key === String(r.fkMatricula))?.serverVersion ?? r.baseVersion,
    })),
  }),
  describe: (p) => ({
    titulo: `Asistencia — ${p.REGISTROS?.length ?? 0} estudiante(s)`,
    detalle: describeSesion(p),
    ruta: "/app/asistencia",
  }),
})

registerOutboxHandler<RegistrarPayload>({
  kind: "asistencia.marcar-todos",
  version: 1,
  entityKey: sesionEntityKey,
  send: sendRegistrar,
  noteOf: (r) => {
    const res = r as RegistrarResultado
    if (res?.pendientes?.length) return PERIODO_SOLICITUD_NOTE
    return `Se marcó Asistió a ${res?.afectados ?? 0} estudiante(s) sin registro.`
  },
  invalidates: () => ASISTENCIA_KEYS,
  describe: (p) => ({
    titulo: "Asistencia — Marcar todos como Asistió",
    detalle: `${describeSesion(p)}. Se marcará Asistió a quienes no tengan registro cuando se sincronice.`,
    ruta: "/app/asistencia",
  }),
})

export type RegistrarInput = AsistenciaRegistrarRequest & {
  /** Versión (`updated_at`) por estudiante que vio el docente, si el padrón la trae. */
  versiones?: Record<number, string | null | undefined>
}

async function registrarAsistencia({ versiones, ...body }: RegistrarInput): Promise<RegistrarResultado> {
  const files: Record<string, File> = {}
  const REGISTROS = body.REGISTROS?.map((r): RegistroCola => {
    const baseVersion = versiones?.[r.fkMatricula] ?? null
    if (r.fkArchivo instanceof File) {
      const key = `soporte-${r.fkMatricula}`
      files[key] = r.fkArchivo
      return { ...r, fkArchivo: key, baseVersion }
    }
    return { ...r, fkArchivo: r.fkArchivo, baseVersion }
  })
  // "Marcar todos" depende del estado del servidor al sincronizar (P17): sin optimista.
  const kind = body.MARCAR_TODOS && !REGISTROS?.length ? "asistencia.marcar-todos" : "asistencia.registrar"
  const outcome = await runOrQueue<RegistrarPayload, RegistrarResultado>(kind, { ...body, REGISTROS }, { files })
  return outcome.queued ? { afectados: 0, pendientes: [], queued: true } : outcome.result
}

export function useAsistenciaRegistrarMutation({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof registrarAsistencia> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: registrarAsistencia,
    ...rest,
    // La outbox decide si hay red: la mutación no debe quedar pausada.
    networkMode: "always",
    onSuccess: (...args) => {
      // Encolada: la outbox invalida al sincronizar.
      if (!args[0].queued) {
        queryClient.invalidateQueries({ queryKey: asistenciaKeys.all })
        invalidarPlaneadorPorAsistencia(queryClient)
      }
      onSuccess?.(...args)
    },
  })
}
