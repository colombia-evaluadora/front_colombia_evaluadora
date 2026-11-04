import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { invalidateCampuses } from "@/features/establishment/campuses/api/mutations/invalidate-campuses"
import type { CampusStatus } from "@/features/establishment/campuses/api/types/campus"

export interface ChangeCampusStatusInput {
  campusId: number
  status: CampusStatus
}

/** `PUT /establecimientos/sedes/:ID/estado`. Con períodos en Inscripciones o Abiertos responde 409 con la lista. */
export async function changeCampusStatus({ campusId, status }: ChangeCampusStatusInput): Promise<void> {
  await evalCol.put(`/establecimientos/sedes/${campusId}/estado`, { status })
}

export function useChangeCampusStatus({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof changeCampusStatus> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: changeCampusStatus,
    ...rest,
    onSuccess: (...args) => {
      invalidateCampuses(queryClient)
      onSuccess?.(...args)
    },
  })
}
