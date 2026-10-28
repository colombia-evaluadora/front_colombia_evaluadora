import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { CreateGradeRequest } from "@/features/establishment/academic-period/api/types/grade"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "@/features/establishment/academic-period/api/utils/extract-write-result"
import { resolveGradoSiguienteId } from "@/features/establishment/academic-period/api/mutations/resolve-grado-siguiente"
import { invalidateGradeRelated } from "./invalidate"
import { toRecesosBody } from "@/features/establishment/academic-period/utils/recesos"

// `fn_grado_crear` (id_query 57); `gradoSiguiente` se resuelve a PK.
async function createGrade(input: CreateGradeRequest): Promise<{ id: number }> {
  const fkGradoSiguiente = await resolveGradoSiguienteId(input.gradoSiguiente)
  const raw = await api.post<WriteResultResponse>("/eval-col/grados", {
    FK_PERIODO: input.academicPeriodId,
    FK_NIVEL: input.teachingLevelId,
    NOMBRE: input.nombre,
    FK_GRADO_SIGUIENTE: fkGradoSiguiente,
    // V79: jornadas de continuidad y horario propio del grado.
    JORNADAS_CONTINUIDAD: input.tieneGradoSiguiente ? (input.jornadasContinuidad ?? []).map((j) => j.id) : [],
    PERSONALIZAR_HORARIO: input.personalizarHorario ? "S" : "N",
    HORA_INICIO: input.personalizarHorario ? input.horaInicio : null,
    HORA_FIN: input.personalizarHorario ? input.horaFin : null,
    BLOQUES: input.personalizarHorario ? input.bloques : null,
    RECESOS: input.personalizarHorario ? toRecesosBody(input.recesos) : [],
  })
  return { id: extractWriteResultId(raw) }
}

interface UseCreateGradeOptions {
  mutationConfig?: MutationConfig<typeof createGrade>
}

export function useCreateGrade({ mutationConfig }: UseCreateGradeOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createGrade,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateGradeRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
