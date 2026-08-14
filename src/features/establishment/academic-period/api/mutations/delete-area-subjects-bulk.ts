import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/area-subject"

// `fn_area_bulk_delete` no tiene `id_query` asignado todavía en `public.query`
// (sin endpoint real de baja masiva) — mientras tanto se hace secuencial
// contra el soft-delete individual (`fn_area_soft_delete`).
async function deleteAreaSubjectsBulk(ids: number[]): Promise<MutationResult> {
  for (const id of ids) {
    await api.put(`/eval-col/areas/eliminar/${id}`)
  }
  return { status: "ok", message: "Áreas/asignaturas eliminadas." }
}

interface UseDeleteAreaSubjectsBulkOptions {
  mutationConfig?: MutationConfig<typeof deleteAreaSubjectsBulk>
}

export function useDeleteAreaSubjectsBulk({
  mutationConfig,
}: UseDeleteAreaSubjectsBulkOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAreaSubjectsBulk,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["area-subjects"] })
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
      queryClient.invalidateQueries({ queryKey: ["especialidades"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
