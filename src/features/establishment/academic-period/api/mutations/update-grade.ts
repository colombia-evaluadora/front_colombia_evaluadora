import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateGradeRequest,
} from "@/features/establishment/academic-period/api/types/grade"
import { resolveGradoSiguienteId } from "@/features/establishment/academic-period/api/mutations/resolve-grado-siguiente"
import { invalidateGradeRelated } from "./invalidate"

interface UpdateGradeInput {
  id: number
  values: UpdateGradeRequest
}

// `fn_grado_actualizar` (id_query 58, PUT desde V67); el código no se edita.
async function updateGrade({ id, values }: UpdateGradeInput): Promise<MutationResult> {
  const fkGradoSiguiente =
    values.tieneGradoSiguiente === false
      ? null
      : await resolveGradoSiguienteId(values.gradoSiguiente)
  return api.put(`/eval-col/grados/${id}`, {
    FK_NIVEL: values.teachingLevelId,
    NOMBRE: values.nombre,
    FK_GRADO_SIGUIENTE: fkGradoSiguiente,
    TIENE_GRADO_SIGUIENTE: values.tieneGradoSiguiente,
  })
}

interface UseUpdateGradeOptions {
  mutationConfig?: MutationConfig<typeof updateGrade>
}

export function useUpdateGrade({ mutationConfig }: UseUpdateGradeOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateGrade,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateGradeRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
