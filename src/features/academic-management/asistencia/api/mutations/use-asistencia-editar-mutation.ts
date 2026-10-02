import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { invalidarPlaneadorPorAsistencia } from "@/features/planeador/api/query/invalidar-por-asistencia"

import { subirSoporte } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-registrar-mutation"
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
}

/**
 * Un PATCH por registro: es el único endpoint que devuelve
 * `solicitudes_pendientes` (Regla 75). Devuelve las solicitudes abiertas;
 * vacío = se aplicó directo.
 */
async function editarAsistencia({ pks, body }: EditarAsistenciaInput): Promise<number[]> {
  const soporteArchivo = body.SOPORTE_ARCHIVO
  const SOPORTE_ARCHIVO = soporteArchivo instanceof File ? await subirSoporte(soporteArchivo) : soporteArchivo
  const respuestas = await Promise.all(
    pks.map((pk) =>
      api.patch<AsistenciaEditarResponse | AsistenciaEditarResponse[]>(`/eval-col/asistencias/${pk}`, {
        ...body,
        SOPORTE_ARCHIVO,
      }),
    ),
  )
  return respuestas.flatMap((raw) => (Array.isArray(raw) ? raw[0] : raw)?.solicitudes_pendientes ?? [])
}

export function useAsistenciaEditarMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: editarAsistencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asistencia"] })
      invalidarPlaneadorPorAsistencia(queryClient)
    },
  })
}
