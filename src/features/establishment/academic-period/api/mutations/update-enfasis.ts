import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "../utils/extract-write-result"
import { invalidateEnfasisRelated } from "./invalidate"

export interface UpdateEnfasisInput {
  id: number
  nombre: string
}

// `fn_enfasis_actualizar` (id_query 103): solo se edita el nombre.
async function updateEnfasis(input: UpdateEnfasisInput): Promise<number> {
  const raw: WriteResultResponse = await api.put(
    `/eval-col/enfasis/${input.id}`,
    { NOMBRE: input.nombre }
  )
  return extractWriteResultId(raw)
}

interface UseUpdateEnfasisOptions {
  mutationConfig?: MutationConfig<typeof updateEnfasis>
}

export function useUpdateEnfasis({
  mutationConfig,
}: UseUpdateEnfasisOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateEnfasis,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateEnfasisRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
