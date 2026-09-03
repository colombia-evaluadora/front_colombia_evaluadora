import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { AsistenciaEditarRequest } from "@/features/academic-management/asistencia/api/types/asistencia"

interface EditarAsistenciaInput {
  pkTasistencia: number
  body: AsistenciaEditarRequest
}

function editarAsistencia({ pkTasistencia, body }: EditarAsistenciaInput): Promise<number> {
  return api.patch<number>(`/eval-col/asistencias/${pkTasistencia}`, body)
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
