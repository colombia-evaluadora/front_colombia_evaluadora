import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/area-subject"

// `fn_area_soft_delete` (id_query 37) — sin confirmar en ThunderClient
// todavía; path/método según el contrato.
async function deleteAreaSubject(codigo: number): Promise<MutationResult> {
  await api.put(`/eval-col/areas/eliminar/${codigo}`)
  return { status: "ok", message: "Área/asignatura eliminada." }
}

interface UseDeleteAreaSubjectOptions {
  mutationConfig?: MutationConfig<typeof deleteAreaSubject>
}

export function useDeleteAreaSubject({
  mutationConfig,
}: UseDeleteAreaSubjectOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAreaSubject,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["area-subjects"] })
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
      queryClient.invalidateQueries({ queryKey: ["especialidades"] })
      queryClient.invalidateQueries({ queryKey: ["study-plans"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
