import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateGradeRequest,
} from "@/features/establishment/academic-period/api/types/grade"
import { resolveGradoSiguienteId } from "@/features/establishment/academic-period/api/mutations/resolve-grado-siguiente"
import { invalidateGradeRelated } from "./invalidate"
import { toRecesosBody } from "@/features/establishment/academic-period/utils/recesos"

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
    // V79: jornadas de continuidad y horario propio del grado.
    JORNADAS_CONTINUIDAD: values.tieneGradoSiguiente ? (values.jornadasContinuidad ?? []).map((j) => j.id) : [],
    PERSONALIZAR_HORARIO: values.personalizarHorario ? "S" : "N",
    HORA_INICIO: values.personalizarHorario ? values.horaInicio : null,
    HORA_FIN: values.personalizarHorario ? values.horaFin : null,
    BLOQUES: values.personalizarHorario ? values.bloques : null,
    RECESOS: values.personalizarHorario ? toRecesosBody(values.recesos) : [],
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
