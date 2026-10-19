import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import {
  extractWriteResultId,
  type WriteResultResponse,
} from "../utils/extract-write-result"
import { invalidateEnfasisRelated } from "./invalidate"

export interface CreateEnfasisInput {
  academicPeriodId: number
  nombre: string
}

// `fn_enfasis_resolver` (V63): find-or-create; el backend deriva el establecimiento.
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
      invalidateEnfasisRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
