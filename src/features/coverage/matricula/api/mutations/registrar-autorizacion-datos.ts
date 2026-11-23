import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { invalidarMatriculas } from "@/features/coverage/matricula/api/query-keys"

export interface RegistrarAutorizacionInput {
  matriculaId: string
  /** Nombre del acudiente que la da en el establecimiento. */
  acudiente: string
}

/**
 * Registrar autorización de datos (Regla 81): vale por estudiante y
 * Establecimiento; al darla se quitan la marca y el enmascarado.
 */
export async function registrarAutorizacionDatos(input: RegistrarAutorizacionInput) {
  await evalCol.postRow(`/cobertura-academica/matricula/${input.matriculaId}/autorizacion-datos`, {
    ACUDIENTE: input.acudiente,
    AUTORIZACION: "S",
  })
}

export function useRegistrarAutorizacionDatos({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof registrarAutorizacionDatos> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: registrarAutorizacionDatos,
    ...rest,
    onSuccess: (...args) => {
      // La marca sale en el listado; el enmascarado, en el detalle y en Editar.
      invalidarMatriculas(queryClient)
      onSuccess?.(...args)
    },
  })
}
