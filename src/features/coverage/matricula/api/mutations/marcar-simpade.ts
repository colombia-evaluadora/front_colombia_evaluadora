import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { invalidarMatriculas } from "@/features/coverage/matricula/api/query-keys"

export interface MarcarSimpadeInput {
  matriculaId: string
  /** yyyy-MM-dd, no posterior a hoy. */
  fechaIngreso: string
  funcionarioId: number
}

/** Marcar como ingresado al SIMPADE (C.1.LIS.3b): retiro por traslado con acta generada. */
export async function marcarSimpade(input: MarcarSimpadeInput) {
  await evalCol.put(`/cobertura-academica/matricula/${input.matriculaId}/simpade`, {
    FECHA_INGRESO: input.fechaIngreso,
    FK_FUNCIONARIO: input.funcionarioId,
  })
}

export function useMarcarSimpadeMatricula({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof marcarSimpade> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: marcarSimpade,
    ...rest,
    onSuccess: (...args) => {
      // La acción desaparece de la fila al quedar marcada.
      invalidarMatriculas(queryClient)
      onSuccess?.(...args)
    },
  })
}
