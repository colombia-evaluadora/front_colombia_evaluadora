import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"

import type { CurricularReferenceMutationResult } from "@/features/academic-management/curricular-references/api/mutations/create"
import type { CurricularReference } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

// Toggle directo de la Vista Maestra: PATCH parcial, solo el estado.
function toggleStatus({
  reference,
  active,
}: {
  reference: CurricularReference
  active: boolean
}): Promise<CurricularReferenceMutationResult> {
  const url = apiPath(
    `/academic-management/curricular-references/${reference.id}`,
    `/referentes-curriculares/${reference.id}`,
  )
  if (env.ENABLE_API_MOCKING) {
    // El mock reemplaza el registro completo.
    return api.put(url, { ...reference, active })
  }
  return api.patch(url, {
    ESTADO: active ? "A" : "I",
    ...(active ? {} : { ANIO_HASTA: new Date().getFullYear() }),
  })
}

export function useToggleStatus(options: { mutationConfig?: MutationConfig<typeof toggleStatus> } = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: toggleStatus,
    ...options.mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["curricular-references"] })
      queryClient.invalidateQueries({ queryKey: ["curricular-reference"] })
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}
