import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { subirSoporte } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-registrar-mutation"
import type { AsistenciaEditarRequest } from "@/features/academic-management/asistencia/api/types/asistencia"

interface EditarAsistenciaInput {
  pkTasistencia: number
  body: Omit<AsistenciaEditarRequest, "SOPORTE_ARCHIVO"> & {
    /** Archivo nuevo a subir; `AsistenciaEditarRequest` solo acepta el `fk` ya resuelto. */
    SOPORTE_ARCHIVO?: File | number
  }
}

async function editarAsistencia({ pkTasistencia, body }: EditarAsistenciaInput): Promise<number> {
  const soporteArchivo = body.SOPORTE_ARCHIVO
  const SOPORTE_ARCHIVO = soporteArchivo instanceof File ? await subirSoporte(soporteArchivo) : soporteArchivo
  return api.patch<number>(`/eval-col/asistencias/${pkTasistencia}`, { ...body, SOPORTE_ARCHIVO })
}

export function useAsistenciaEditarMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: editarAsistencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asistencia"] })
    },
  })
}
