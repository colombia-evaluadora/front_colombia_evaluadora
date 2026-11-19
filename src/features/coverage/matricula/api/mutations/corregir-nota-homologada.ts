import { useMutation, useQueryClient } from "@tanstack/react-query"

import { postMultipart } from "@/lib/files"
import type { MutationConfig } from "@/lib/react-query"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"

export interface CorregirNotaHomologadaInput {
  matriculaId: string
  notaId: number
  nota: number
  reason: string
  support: File
}

/** Multipart con el SOPORTE: crea una versión nueva de la nota y conserva la original (Sección 4.2). */
export async function corregirNotaHomologada(input: CorregirNotaHomologadaInput) {
  await postMultipart(
    `/eval-col/cobertura-academica/matricula/${input.matriculaId}/notas-homologadas/${input.notaId}/corregir`,
    { NOTA: input.nota, MOTIVO: input.reason.trim() },
    { SOPORTE: input.support },
  )
}

export function useCorregirNotaHomologada({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof corregirNotaHomologada> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: corregirNotaHomologada,
    ...rest,
    onSuccess: (...args) => {
      // Cuelga del detalle: también refresca el origen ya abierto de esa nota.
      queryClient.invalidateQueries({ queryKey: matriculaKeys.notasHomologadas(args[1].matriculaId) })
      onSuccess?.(...args)
    },
  })
}
