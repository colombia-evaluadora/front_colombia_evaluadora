import { outboxHeaders } from "@/lib/offline/outbox/headers"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { runOrQueue } from "@/lib/offline/outbox/engine"
import { registerOutboxHandler } from "@/lib/offline/outbox/registry"

import { invalidarPlaneadorPorAsistencia } from "@/features/planeador/api/query/invalidar-por-asistencia"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

import {
  PERIODO_SOLICITUD_NOTE,
  subirSoporte,
} from "@/features/academic-management/asistencia/api/mutations/use-asistencia-registrar-mutation"
import type {
  AsistenciaEditarRequest,
  AsistenciaEditarResponse,
} from "@/features/academic-management/asistencia/api/types/asistencia"

interface EditarAsistenciaInput {
  /** Los registros de la fila: una corrida de bloques se edita entera, no solo su primer bloque. */
  pks: number[]
  body: Omit<AsistenciaEditarRequest, "SOPORTE_ARCHIVO"> & {
    /** Archivo nuevo a subir; `AsistenciaEditarRequest` solo acepta el `fk` ya resuelto. */
    SOPORTE_ARCHIVO?: File | number
  }
  /** `updated_at` por pk que vio el docente (CAS, BE-5). */
  versiones?: Record<number, string | null | undefined>
}

export interface EditarResultado {
  /** Solicitudes abiertas (Regla 75); vacío = se aplicó directo. */
  pendientes: number[]
  /** Alguna edición quedó en la outbox. */
  queued: boolean
}

/** Una op por registro (pk): nunca un `Promise.all` del que no se sabe qué entró (B11). */
interface EditarPayload {
  pk: number
  body: Omit<AsistenciaEditarRequest, "SOPORTE_ARCHIVO"> & { SOPORTE_ARCHIVO?: number | string }
  baseVersion?: string | null
}

registerOutboxHandler<EditarPayload>({
  kind: "asistencia.editar",
  version: 1,
  entityKey: (p) => `asistencia:registro:${p.pk}`,
  coalesce: (prev, next) => ({
    ...next,
    body: { ...prev.body, ...next.body },
    baseVersion: prev.baseVersion ?? next.baseVersion,
  }),
  async send(p, ctx) {
    const soporte = p.body.SOPORTE_ARCHIVO
    const SOPORTE_ARCHIVO = typeof soporte === "string" ? await ctx.resolveFile(soporte) : soporte
    const raw = await api.patch<AsistenciaEditarResponse | AsistenciaEditarResponse[]>(
      `/eval-col/asistencias/${p.pk}`,
      {
        ...p.body,
        ...(SOPORTE_ARCHIVO !== undefined ? { SOPORTE_ARCHIVO } : {}),
        ...(p.baseVersion ? { BASE_VERSION: p.baseVersion } : {}),
      },
      { headers: outboxHeaders(ctx), background: ctx.background },
    )
    return (Array.isArray(raw) ? raw[0] : raw)?.solicitudes_pendientes ?? []
  },
  upload: (file, background) => subirSoporte(file, background),
  noteOf: (r) => ((r as number[])?.length ? PERIODO_SOLICITUD_NOTE : null),
  invalidates: () => [["asistencia"], planeadorKeys.planilla.calificaciones.all, ["planeador", "actividad"]],
  rebase: (p, conflict) => ({ ...p, baseVersion: conflict.serverVersion ?? p.baseVersion }),
  describe: (p) => ({
    titulo: "Corrección de asistencia",
    detalle: `Registro ${p.pk}${p.body.TIPO_ASISTENCIA ? ` → tipo ${p.body.TIPO_ASISTENCIA}` : ""}`,
    ruta: "/app/asistencia/seguimiento",
  }),
})

async function editarAsistencia({ pks, body, versiones }: EditarAsistenciaInput): Promise<EditarResultado> {
  const file = body.SOPORTE_ARCHIVO instanceof File ? body.SOPORTE_ARCHIVO : null
  const soporte = file ? "soporte" : (body.SOPORTE_ARCHIVO as number | undefined)
  const pendientes: number[] = []
  let queued = false
  for (const pk of pks) {
    const outcome = await runOrQueue<EditarPayload, number[]>(
      "asistencia.editar",
      { pk, body: { ...body, SOPORTE_ARCHIVO: soporte }, baseVersion: versiones?.[pk] ?? null },
      { files: file ? { soporte: file } : {} },
    )
    if (outcome.queued) queued = true
    else pendientes.push(...outcome.result)
  }
  return { pendientes, queued }
}

export function useAsistenciaEditarMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: editarAsistencia,
    networkMode: "always",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asistencia"] })
      invalidarPlaneadorPorAsistencia(queryClient)
    },
  })
}
