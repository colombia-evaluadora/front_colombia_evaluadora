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

async function updateGradeGroup({
  id,
  sedeId,
  values,
}: UpdateGradeGroupInput): Promise<MutationResult> {
  const [fkModeloPedagogico, fkFuncionario] = await Promise.all([
    resolveMetodologiaId(values.metodologia),
    resolveDirectorId(sedeId, values.director),
  ])
  return api.put<MutationResult>(`/eval-col/grupos/${id}`, {
    NOMBRE: values.codigo,
    FK_MODELO_PEDAGOGICO: fkModeloPedagogico,
    CAPACIDAD: values.cupo,
    FK_FUNCIONARIO: fkFuncionario,
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
      queryClient.invalidateQueries({ queryKey: ["grade-groups"] })
      // Cambiar el director del grupo re-sincroniza sus asignaciones
      // académicas en preescolar (V285/fn_docente_director_grupo_sync) —
      // sin esto el transfer-list de Asignaciones Académicas quedaba con
      // datos viejos hasta recargar la página.
      queryClient.invalidateQueries({ queryKey: ["assignment-subjects"] })
      // Las asignaturas YA asignadas a cada docente viven en otra query
      // ("teacher-assignments", una por funcionario) — también cambian
      // cuando el sync de preescolar mueve auto-asignaciones entre el
      // director viejo y el nuevo.
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
