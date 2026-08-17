import Axios from "axios"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  BulkDeleteResult,
  BulkDeleteRow,
} from "@/features/establishment/academic-period/api/mutations/bulk-delete-result"

// `fn_area_bulk_delete` no tiene `id_query` asignado todavía en `public.query`
// (sin endpoint real de baja masiva) — mientras tanto se hace secuencial
// contra el soft-delete individual (`fn_area_soft_delete`). Cada id se
// intenta por su cuenta (uno que falla no aborta el resto) y se arma el
// mismo `{ rows }` que devuelven los endpoints de baja masiva reales, para
// que el diálogo pueda mostrar éxitos/fallos parciales igual que ahí.
async function deleteAreaSubjectsBulk(ids: number[]): Promise<BulkDeleteResult> {
  const rows: BulkDeleteRow[] = []
  for (const id of ids) {
    try {
      await api.put(`/eval-col/areas/eliminar/${id}`)
      rows.push({ id, eliminado: true })
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
