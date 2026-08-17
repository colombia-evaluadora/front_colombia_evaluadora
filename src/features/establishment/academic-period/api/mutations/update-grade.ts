import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateGradeRequest,
} from "@/features/establishment/academic-period/api/types/grade"
import { resolveGradoSiguienteId } from "@/features/establishment/academic-period/api/mutations/resolve-grado-siguiente"

interface UpdateGradeInput {
  id: number
  values: UpdateGradeRequest
}

// `PUT /eval-col/grados/:ID` (`fn_grado_actualizar`, id_query 58 — PUT desde
// V67, no PATCH). El código (`grado`) no se puede editar (lo fija
// `fn_grado_crear` al crear), así que no viaja.
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
      queryClient.invalidateQueries({ queryKey: ["grades"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
