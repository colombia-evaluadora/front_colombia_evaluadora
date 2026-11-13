import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"
import type {
  MatriculaAcademicInfo,
  MatriculaAsignaturasCambios,
} from "@/features/coverage/matricula/api/types/matricula"

export interface SaveMatriculaAsignaturasInput {
  matriculaId: string
  academic: Pick<MatriculaAcademicInfo, "mediaTecnicaExterna" | "institucionExterna">
  cambios: MatriculaAsignaturasCambios
}

/** ¿Hay algo que guardar después del alta? Sin media técnica ni cambios, el alta ya dejó las obligatorias. */
export function hasAsignaturasParaGuardar({ academic, cambios }: Omit<SaveMatriculaAsignaturasInput, "matriculaId">) {
  return Boolean(academic.mediaTecnicaExterna) || Object.keys(cambios).length > 0
}

export async function saveMatriculaAsignaturas({ matriculaId, academic, cambios }: SaveMatriculaAsignaturasInput) {
  const mediaTecnica = Boolean(academic.mediaTecnicaExterna)
  await evalCol.put(`/cobertura-academica/matricula/${matriculaId}/asignaturas`, {
    MEDIA_TECNICA_EXTERNA: mediaTecnica ? "S" : "N",
    INSTITUCION_EXTERNA: mediaTecnica ? (academic.institucionExterna ?? "").trim() : null,
    ASIGNATURAS: Object.entries(cambios).map(([id, cambio]) => ({
      id: Number(id),
      matriculada: cambio.matriculada,
      // Sin media técnica externa nada se cursa afuera.
      externa: mediaTecnica && cambio.matriculada && cambio.externa ? "S" : "N",
    })),
  })
}

export function useSaveMatriculaAsignaturas({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof saveMatriculaAsignaturas> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: saveMatriculaAsignaturas,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: matriculaKeys.asignaturas(args[1].matriculaId) })
      onSuccess?.(...args)
    },
  })
}
