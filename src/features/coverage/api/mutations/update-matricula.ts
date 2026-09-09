import { useMutation, useQueryClient } from "@tanstack/react-query"

import { patchMultipart } from "@/lib/files"
import { toUpdateMatriculaBody } from "@/features/coverage/api/mutations/to-update-matricula-body"
import type { MutationConfig } from "@/lib/react-query"
import type { CreateMatriculaInput, MatriculaMutationResult } from "@/features/coverage/api/types/matricula"

export interface UpdateMatriculaMutationInput {
  id: string
  values: CreateMatriculaInput
  pkTpadre: number | null
  pkUsuarioAcudiente: number | null
  actualizarAcudiente: boolean
}

async function updateMatricula({
  id,
  values,
  pkTpadre,
  pkUsuarioAcudiente,
  actualizarAcudiente,
}: UpdateMatriculaMutationInput): Promise<MatriculaMutationResult> {
  await patchMultipart(
    `/eval-col/cobertura-academica/matricula/${id}`,
    toUpdateMatriculaBody(values, { pkTpadre, pkUsuarioAcudiente, actualizarAcudiente }),
    {},
  )
  return { status: "ok", message: "Matrícula actualizada correctamente.", matricula: null }
}

interface UseUpdateMatriculaOptions {
  mutationConfig?: MutationConfig<typeof updateMatricula>
}

export function useUpdateMatricula({ mutationConfig }: UseUpdateMatriculaOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: updateMatricula,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["matricula"] })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
