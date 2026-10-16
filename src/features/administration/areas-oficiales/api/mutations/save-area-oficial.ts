import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { invalidarAreasOficiales } from "@/features/administration/areas-oficiales/api/mutations/invalidar-areas-oficiales"
import type {
  AreaOficial,
  Resultado,
} from "@/features/administration/areas-oficiales/api/types/area-oficial"

interface SaveAreaOficialVariables {
  /** Presente = modificar. */
  id?: number
  nombre: string
  /** pks de `TNIVEL_ENSENANZA`; el PUT los reemplaza todos. */
  niveles: number[]
}

// 409 (23505) si el nombre ya existe; 400 (22023) nombre o niveles inválidos.
// Modificar no toca las asociaciones existentes (Planes de Estudio, Referentes).
async function saveAreaOficial({ id, nombre, niveles }: SaveAreaOficialVariables) {
  const body = { NOMBRE: nombre, NIVELES: niveles }
  const row =
    id == null
      ? await evalCol.postRow<Resultado<AreaOficial>>("/areas-oficiales", body)
      : await evalCol.putRow<Resultado<AreaOficial>>(`/areas-oficiales/${id}`, body)
  return row.resultado
}

export function useSaveAreaOficial({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof saveAreaOficial> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: saveAreaOficial,
    ...rest,
    onSuccess: (...args) => {
      invalidarAreasOficiales(queryClient)
      onSuccess?.(...args)
    },
  })
}
