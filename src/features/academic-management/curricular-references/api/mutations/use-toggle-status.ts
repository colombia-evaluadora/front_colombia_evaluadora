import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { env } from "@/config/env"
import { runOrQueue } from "@/lib/offline/outbox/engine"
import { registerOutboxHandler } from "@/lib/offline/outbox/registry"
import type { MutationConfig } from "@/lib/react-query"

import type { CurricularReferenceMutationResult } from "@/features/academic-management/curricular-references/api/mutations/create"
import type { CurricularReference } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

// Toggle directo de la Vista Maestra: PATCH parcial, solo el estado.
function sendToggleStatus({
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

/**
 * Fase 4 offline (`add-offline-rest`): activar/inactivar el referente se
 * encola en la outbox. Inactivar sin red está bloqueado en la UI porque antes
 * hay que consultar el impacto (`fetchCurricularReferenceImpact`); activar no
 * lo necesita. Dos cambios seguidos sin red se fusionan en el último.
 */
type TogglePayload = { reference: CurricularReference; active: boolean }

registerOutboxHandler<TogglePayload>({
  kind: "referente.estado",
  version: 1,
  entityKey: (p) => `referente:${p.reference.id}:estado`,
  coalesce: (_prev, next) => next,
  send: (p) => sendToggleStatus(p),
  invalidates: () => [["curricular-references"], ["curricular-reference"]],
  describe: (p) => ({
    titulo: p.active ? "Activar referente curricular" : "Inactivar referente curricular",
    detalle: p.reference.name ?? `#${p.reference.id}`,
    ruta: "/app/gestion-academica/referentes-curriculares",
  }),
})

async function toggleStatus(input: TogglePayload): Promise<CurricularReferenceMutationResult & { queued?: boolean }> {
  const outcome = await runOrQueue<TogglePayload, CurricularReferenceMutationResult>("referente.estado", input)
  return outcome.queued ? ({ queued: true } as CurricularReferenceMutationResult & { queued: boolean }) : outcome.result
}

export function useToggleStatus(options: { mutationConfig?: MutationConfig<typeof toggleStatus> } = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: toggleStatus,
    networkMode: "always",
    ...options.mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["curricular-references"] })
      queryClient.invalidateQueries({ queryKey: ["curricular-reference"] })
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}
