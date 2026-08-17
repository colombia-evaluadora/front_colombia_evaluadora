import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { CreateGradeRequest } from "@/features/establishment/academic-period/api/types/grade"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "@/features/establishment/academic-period/api/mutations/extract-write-result"
import { resolveGradoSiguienteId } from "@/features/establishment/academic-period/api/mutations/resolve-grado-siguiente"

// Body PLANO con las llaves de `fn_grado_crear` (`POST /eval-col/grados`,
// id_query 57). `nombre` viaja tal cual (el backend lo valida contra el
// catálogo GRADOS por NOMBRE o VALOR y deriva el CODIGO de ahí);
// `gradoSiguiente` sí necesita resolverse a PK (ver resolve-grado-siguiente.ts).
async function createGrade(input: CreateGradeRequest): Promise<{ id: number }> {
  const fkGradoSiguiente = await resolveGradoSiguienteId(input.gradoSiguiente)
  const raw = await api.post<WriteResultResponse>("/eval-col/grados", {
    FK_PERIODO: input.academicPeriodId,
    FK_NIVEL: input.teachingLevelId,
    NOMBRE: input.nombre,
    FK_GRADO_SIGUIENTE: fkGradoSiguiente,
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
      queryClient.invalidateQueries({ queryKey: ["grades"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
