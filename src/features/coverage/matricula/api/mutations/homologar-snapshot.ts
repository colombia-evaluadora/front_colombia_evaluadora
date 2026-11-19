import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"
import type {
  EmparejamientoAsignatura,
  EmparejamientoPeriodo,
} from "@/features/coverage/matricula/api/types/notas-homologadas"

export interface HomologarSnapshotInput {
  matriculaId: string | number
  snapshotId: number
  periodos: EmparejamientoPeriodo[]
  asignaturas: EmparejamientoAsignatura[]
}

export interface HomologarSnapshotResult {
  notasHomologadas: number
  pendientes: number
}

/** Confirma el emparejamiento; la autorización del acudiente ya se marcó en el modal (Ley 1581). */
export async function homologarSnapshot(input: HomologarSnapshotInput) {
  const row = await evalCol.postRow<{ homologacion: HomologarSnapshotResult }>(
    `/cobertura-academica/matricula/${input.matriculaId}/snapshot/${input.snapshotId}/homologar`,
    { AUTORIZACION: "S", PERIODOS: input.periodos, ASIGNATURAS: input.asignaturas },
  )
  return row.homologacion
}

export function useHomologarSnapshot({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof homologarSnapshot> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: homologarSnapshot,
    ...rest,
    onSuccess: (...args) => {
      const id = String(args[1].matriculaId)
      queryClient.invalidateQueries({ queryKey: matriculaKeys.snapshotPendiente(id) })
      queryClient.invalidateQueries({ queryKey: matriculaKeys.notasHomologadas(id) })
      onSuccess?.(...args)
    },
  })
}
