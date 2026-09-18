import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { invalidarPlaneadorPorAsistencia } from "@/features/planeador/api/query/invalidar-por-asistencia"

import { subirSoporte } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-registrar-mutation"
import type { AsistenciaEditarRequest } from "@/features/academic-management/asistencia/api/types/asistencia"

interface EditarAsistenciaInput {
  /** Los registros de la fila: una corrida de bloques se edita entera, no solo su primer bloque. */
  pks: number[]
  body: Omit<AsistenciaEditarRequest, "SOPORTE_ARCHIVO"> & {
    /** Archivo nuevo a subir; `AsistenciaEditarRequest` solo acepta el `fk` ya resuelto. */
    SOPORTE_ARCHIVO?: File | number
  }
}

async function editarAsistencia({ pks, body }: EditarAsistenciaInput): Promise<number> {
  const soporteArchivo = body.SOPORTE_ARCHIVO
  const SOPORTE_ARCHIVO = soporteArchivo instanceof File ? await subirSoporte(soporteArchivo) : soporteArchivo
  return api.post<number>("/eval-col/asistencias/editar-masivo", { ...body, SOPORTE_ARCHIVO, IDS: pks })
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
