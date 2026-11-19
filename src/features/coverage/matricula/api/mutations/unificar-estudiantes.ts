import { useMutation, useQueryClient } from "@tanstack/react-query"

import { postMultipart } from "@/lib/files"
import type { MutationConfig } from "@/lib/react-query"
import { invalidarMatriculas, matriculaKeys } from "@/features/coverage/matricula/api/query-keys"

export interface UnificarEstudiantesInput {
  conservaId: number
  duplicadoId: number
  motivo: string
  soporte: File
}

export interface UnificacionResultado {
  /** Matrículas, reservas e inscripciones que pasaron al registro que se conserva. */
  registrosMovidos: number
}

/**
 * Regla 72: el duplicado no se borra, queda «Unificado en [documento]» y todo
 * lo suyo pasa al que se conserva. Multipart por el SOPORTE.
 */
export async function unificarEstudiantes(input: UnificarEstudiantesInput) {
  const res = await postMultipart<{ rows: { unificacion: UnificacionResultado }[] }>(
    "/eval-col/cobertura-academica/estudiantes/unificar",
    { CONSERVA: input.conservaId, DUPLICADO: input.duplicadoId, MOTIVO: input.motivo.trim() },
    { SOPORTE: input.soporte },
  )
  return res.rows?.[0]?.unificacion ?? { registrosMovidos: 0 }
}

export function useUnificarEstudiantes({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof unificarEstudiantes> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: unificarEstudiantes,
    ...rest,
    onSuccess: (...args) => {
      // Las matrículas del duplicado cambian de estudiante y el duplicado sale de la búsqueda.
      invalidarMatriculas(queryClient)
      queryClient.invalidateQueries({ queryKey: matriculaKeys.buscarEstudiantesAll })
      onSuccess?.(...args)
    },
  })
}
