import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "./extract-write-result"

export interface UpdateEnfasisInput {
  id: number
  nombre: string
}

// ⚠️ Endpoint todavía sin backend — se está armando en paralelo. Path/body
// calcan el patrón de `fn_area_actualizar` (PUT /eval-col/areas/:ID) mientras
// se confirma el real; ajustar cuando esté.
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
      queryClient.invalidateQueries({ queryKey: ["especialidades"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
