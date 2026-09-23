import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { CreateGradeGroupRequest } from "@/features/establishment/academic-period/api/types/grade-group"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "@/features/establishment/academic-period/api/mutations/extract-write-result"
import { resolveMetodologiaId } from "@/features/establishment/academic-period/api/mutations/resolve-metodologia-id"

async function createGradeGroup(input: CreateGradeGroupRequest): Promise<{ id: number }> {
  const fkModeloPedagogico = await resolveMetodologiaId(input.metodologia)
  const raw = await api.post<WriteResultResponse>(`/eval-col/grados/${input.gradeId}/grupos`, {
    FK_GRADO: input.gradeId,
    NOMBRE: input.codigo,
    FK_MODELO_PEDAGOGICO: fkModeloPedagogico,
    CAPACIDAD: input.cupo,
    FK_FUNCIONARIO: input.directorId,
  })
  return { id: extractWriteResultId(raw) }
}

interface UseCreateGradeGroupOptions {
  mutationConfig?: MutationConfig<typeof createGradeGroup>
}

export function useCreateGradeGroup({ mutationConfig }: UseCreateGradeGroupOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createGradeGroup,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["grade-groups"] })
      queryClient.invalidateQueries({ queryKey: ["assignment-subjects"] })
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
