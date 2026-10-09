import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { invalidarPlaneadorPorAsistencia } from "@/features/planeador/api/query/invalidar-por-asistencia"
import { postMultipart } from "@/lib/files"

import type {
  AsistenciaRegistrarRequest,
  AsistenciaRegistroManual,
} from "@/features/academic-management/asistencia/api/types/asistencia"

interface SubirSoporteResponse {
  pk_tarchivo: number
}

export async function subirSoporte(file: File): Promise<number> {
  const raw = await postMultipart<{ rows: SubirSoporteResponse[] } | SubirSoporteResponse>(
    "/eval-col/asistencias/soporte",
    {},
    { SOPORTE: file },
  )
  const fila = "rows" in raw ? raw.rows[0] : raw
  return fila.pk_tarchivo
}

async function resolverRegistros(
  registros: AsistenciaRegistroManual[] | undefined,
): Promise<AsistenciaRegistroManual[] | undefined> {
  if (!registros?.length) return registros
  return Promise.all(
    registros.map(async (registro) =>
      registro.fkArchivo instanceof File
        ? { ...registro, fkArchivo: await subirSoporte(registro.fkArchivo) }
        : registro,
    ),
  )
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
}

async function registrarAsistencia(body: AsistenciaRegistrarRequest): Promise<RegistrarResultado> {
  const REGISTROS = await resolverRegistros(body.REGISTROS)
  const raw = await api.post<RegistrarResponse | RegistrarResponse[] | number>("/eval-col/asistencias/registrar", {
    ...body,
    REGISTROS,
  })
  if (typeof raw === "number") return { afectados: raw, pendientes: [] }
  const fila = Array.isArray(raw) ? raw[0] : raw
  return { afectados: Number(fila?.registros_afectados ?? 0), pendientes: fila?.solicitudes_pendientes ?? [] }
}

export function useAsistenciaRegistrarMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: registrarAsistencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asistencia"] })
      invalidarPlaneadorPorAsistencia(queryClient)
    },
  })
}
