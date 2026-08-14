import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "./extract-write-result"

export interface UpdateEnfasisInput {
  id: number
  nombre: string
}

// `PUT /eval-col/enfasis/:ID` (`fn_enfasis_actualizar`, id_query 103) —
// confirmado contra la función real: `p_nombre`/`p_codigo`/`p_fk_especialidad`
// son todos opcionales (COALESCE con el valor actual si no vienen). La UI
// solo deja editar el nombre, así que solo se manda `NOMBRE` — `CODIGO`/
// `FK_ESPECIALIDAD` quedan como estaban.
async function updateEnfasis(input: UpdateEnfasisInput): Promise<number> {
  const raw: WriteResultResponse = await api.put(
    `/eval-col/enfasis/${input.id}`,
    { NOMBRE: input.nombre }
  )
  return extractWriteResultId(raw)
}

interface UseUpdateEnfasisOptions {
  mutationConfig?: MutationConfig<typeof updateEnfasis>
}

export function useUpdateEnfasis({
  mutationConfig,
}: UseUpdateEnfasisOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateEnfasis,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["especialidades"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
