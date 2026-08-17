import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "./extract-write-result"

export interface CreateEnfasisInput {
  academicPeriodId: number
  nombre: string
}

// `POST /eval-col/enfasis` -> `fn_enfasis_resolver` (find-or-create por
// nombre, migración V63). El backend deriva FK_ESTABLECIMIENTO a partir de
// FK_PERIODO (periodo -> sede -> establecimiento), así que el body no
// necesita el establecimiento explícito.
async function createEnfasis(input: CreateEnfasisInput): Promise<number> {
  const raw: WriteResultResponse = await api.post("/eval-col/enfasis", {
    FK_PERIODO: input.academicPeriodId,
    NOMBRE: input.nombre,
  })
  return extractWriteResultId(raw)
}

interface UseCreateEnfasisOptions {
  mutationConfig?: MutationConfig<typeof createEnfasis>
}

export function useCreateEnfasis({
  mutationConfig,
}: UseCreateEnfasisOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createEnfasis,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["especialidades"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
