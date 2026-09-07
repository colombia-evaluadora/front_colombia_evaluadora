import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { postMultipart } from "@/lib/files"

import type { AsistenciaRegistrarRequest } from "@/features/academic-management/asistencia/api/types/asistencia"

function registrarAsistencia(body: AsistenciaRegistrarRequest): Promise<number> {
  const tieneArchivos = body.REGISTROS?.some((r) => r.fkArchivo instanceof File) ?? false
  if (tieneArchivos) {
    return postMultipart<number>("/eval-col/asistencias/registrar", body, {})
  }
  return api.post<number>("/eval-col/asistencias/registrar", body)
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
