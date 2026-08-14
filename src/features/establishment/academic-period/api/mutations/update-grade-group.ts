import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateGradeGroupRequest,
} from "@/features/establishment/academic-period/api/types/grade-group"
import { resolveMetodologiaId } from "@/features/establishment/academic-period/api/mutations/resolve-metodologia-id"
import { resolveDirectorId } from "@/features/establishment/academic-period/api/mutations/resolve-director-id"

interface UpdateGradeGroupInput {
  id: number
  sedeId?: string
  values: UpdateGradeGroupRequest
}

// `PUT /eval-col/grupos/:ID` (`fn_grupo_actualizar`, id_query 63 — PUT desde
// V68, no PATCH). Usa el PK real (`PK_TGRUPO`), no `codigo` — `TGRUPO.CODIGO`
// no lo usa esta función (el "codigo" que ve el front es en realidad NOMBRE).
async function updateGradeGroup({
  id,
  sedeId,
  values,
}: UpdateGradeGroupInput): Promise<MutationResult> {
  const [fkModeloPedagogico, fkFuncionario] = await Promise.all([
    resolveMetodologiaId(values.metodologia),
    resolveDirectorId(sedeId, values.director),
  ])
  return api.put(`/eval-col/grupos/${id}`, {
    NOMBRE: values.codigo,
    FK_MODELO_PEDAGOGICO: fkModeloPedagogico,
    CAPACIDAD: values.cupo,
    FK_FUNCIONARIO: fkFuncionario,
  })
}

interface UseUpdateGradeGroupOptions {
  mutationConfig?: MutationConfig<typeof updateGradeGroup>
}

export function useUpdateGradeGroup({
  mutationConfig,
}: UseUpdateGradeGroupOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateGradeGroup,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["grade-groups"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
