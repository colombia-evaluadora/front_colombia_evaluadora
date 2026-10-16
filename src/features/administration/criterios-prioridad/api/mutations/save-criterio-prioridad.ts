import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { criterioPrioridadKeys } from "@/features/administration/criterios-prioridad/api/query-keys"
import type {
  CriterioPrioridad,
  Resultado,
} from "@/features/administration/criterios-prioridad/api/types/criterio-prioridad"

interface SaveCriterioVariables {
  /** Presente = modificar (solo si no está en uso: 409 si lo está). */
  id?: number
  nombre: string
  descripcion: string | null
  campo: number
  regla: number
  /** Solo con Es uno de; vacío con las demás reglas. */
  valores: number[]
  /** Solo al crear: el estado se cambia después por `/estado`. */
  habilitado?: boolean
}

// 409 (23505) nombre repetido; 400 (22023) datos inválidos o regla que no aplica al campo.
async function saveCriterio({ id, habilitado, ...datos }: SaveCriterioVariables) {
  const body = {
    NOMBRE: datos.nombre,
    DESCRIPCION: datos.descripcion,
    CAMPO: datos.campo,
    REGLA: datos.regla,
    VALORES: datos.valores,
  }
  const row =
    id == null
      ? await evalCol.postRow<Resultado<CriterioPrioridad>>("/criterios-prioridad", {
          ...body,
          HABILITADO: habilitado ?? true,
        })
      : await evalCol.putRow<Resultado<CriterioPrioridad>>(`/criterios-prioridad/${id}`, body)
  return row.resultado
}

export function useSaveCriterioPrioridad({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof saveCriterio> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: saveCriterio,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: criterioPrioridadKeys.lista })
      onSuccess?.(...args)
    },
  })
}
