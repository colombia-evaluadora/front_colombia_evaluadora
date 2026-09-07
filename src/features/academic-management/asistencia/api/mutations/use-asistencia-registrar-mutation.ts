import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { postMultipart } from "@/lib/files"

import type {
  AsistenciaRegistrarRequest,
  AsistenciaRegistroManual,
} from "@/features/academic-management/asistencia/api/types/asistencia"

interface SubirSoporteResponse {
  pk_tarchivo: number
}

async function subirSoporte(file: File): Promise<number> {
  const raw = await postMultipart<{ rows: SubirSoporteResponse[] } | SubirSoporteResponse>(
    "/eval-col/tmp-icono-simbolo",
    {},
    { ICONO: file },
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

async function registrarAsistencia(body: AsistenciaRegistrarRequest): Promise<number> {
  const REGISTROS = await resolverRegistros(body.REGISTROS)
  return api.post<number>("/eval-col/asistencias/registrar", { ...body, REGISTROS })
}

export function useAsistenciaRegistrarMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: registrarAsistencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asistencia"] })
    },
  })
}
