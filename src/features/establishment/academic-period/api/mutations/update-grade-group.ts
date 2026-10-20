import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateGradeGroupRequest,
} from "@/features/establishment/academic-period/api/types/grade-group"
import { resolveMetodologiaId } from "@/features/establishment/academic-period/api/mutations/resolve-metodologia-id"
import { invalidateGradeGroupRelated } from "./invalidate"

interface UpdateGradeGroupInput {
  id: number
  values: UpdateGradeGroupRequest
}

async function updateGradeGroup({
  id,
  values,
}: UpdateGradeGroupInput): Promise<MutationResult> {
  const fkModeloPedagogico = await resolveMetodologiaId(values.metodologia)
  return api.put<MutationResult>(`/eval-col/grupos/${id}`, {
    NOMBRE: values.codigo,
    FK_MODELO_PEDAGOGICO: fkModeloPedagogico,
    CAPACIDAD: values.cupo,
    FK_FUNCIONARIO: values.directorId,
  })
}

interface UseUpdateGradeGroupOptions {
  mutationConfig?: MutationConfig<typeof updateGradeGroup>
}

export function useUpdateGradeGroup({ mutationConfig }: UseUpdateGradeGroupOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateGradeGroup,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateGradeGroupRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
