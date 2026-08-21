import Axios from "axios"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  BulkDeleteResult,
  BulkDeleteRow,
} from "@/features/establishment/academic-period/api/mutations/bulk-delete-result"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/area-subject"

async function deleteAreaSubjectsBulk(ids: number[]): Promise<BulkDeleteResult> {
  const rows: BulkDeleteRow[] = []
  for (const id of ids) {
    try {
      const result = await api.put<MutationResult>(`/eval-col/areas/eliminar/${id}`)
      if (result.status === "error") {
        rows.push({ id, eliminado: false, error_mensaje: result.message })
      } else {
        rows.push({ id, eliminado: true })
      }
    } catch (error) {
      const error_mensaje = Axios.isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : undefined
      rows.push({ id, eliminado: false, error_mensaje })
    }
  }
  return { rows }
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
