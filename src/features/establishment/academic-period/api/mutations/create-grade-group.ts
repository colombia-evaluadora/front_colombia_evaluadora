import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { CreateGradeGroupRequest } from "@/features/establishment/academic-period/api/types/grade-group"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "@/features/establishment/academic-period/api/mutations/extract-write-result"
import { resolveMetodologiaId } from "@/features/establishment/academic-period/api/mutations/resolve-metodologia-id"
import { resolveDirectorId } from "@/features/establishment/academic-period/api/mutations/resolve-director-id"

// Body PLANO con las llaves de `fn_grupo_crear`
// (`POST /eval-col/grados/:ID/grupos`, id_query 62). `jornada` no se manda —
// el backend la deriva del período del grado. `codigo` viaja como `NOMBRE`
// (`TGRUPO.CODIGO` no lo usa esta función).
async function createGradeGroup(
  input: CreateGradeGroupRequest
): Promise<{ id: number }> {
  const [fkModeloPedagogico, fkFuncionario] = await Promise.all([
    resolveMetodologiaId(input.metodologia),
    resolveDirectorId(input.sedeId, input.director),
  ])
  const raw = await api.post<WriteResultResponse>(`/eval-col/grados/${input.gradeId}/grupos`, {
    FK_GRADO: input.gradeId,
    NOMBRE: input.codigo,
    FK_MODELO_PEDAGOGICO: fkModeloPedagogico,
    CAPACIDAD: input.cupo,
    FK_FUNCIONARIO: fkFuncionario,
  })
  return { id: extractWriteResultId(raw) }
}

interface UseCreateGradeGroupOptions {
  mutationConfig?: MutationConfig<typeof createGradeGroup>
}

export function useCreateGradeGroup({
  mutationConfig,
}: UseCreateGradeGroupOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createGradeGroup,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["grade-groups"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
