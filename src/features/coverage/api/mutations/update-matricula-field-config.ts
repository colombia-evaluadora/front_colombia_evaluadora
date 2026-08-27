import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import {
  matriculaFieldConfigQueryKey,
  toMatriculaFieldConfig,
  type MatriculaFieldConfigRow,
} from "@/features/coverage/api/query/use-matricula-field-config-query"
import type {
  MatriculaConfigCampoPatch,
  MatriculaFieldConfig,
} from "@/features/coverage/api/types/matricula"

export interface MatriculaFieldConfigChange {
  fkCampo: number
  patch: MatriculaConfigCampoPatch
}

/**
 * `PUT .../campo/:fkCampo` solo acepta UN campo por llamada — la pantalla
 * deja acumular varios cambios y los manda secuencialmente al guardar. Cada
 * respuesta trae la configuración completa ya actualizada; solo se usa la
 * de la última llamada.
 */
async function updateMatriculaFieldConfig(
  changes: MatriculaFieldConfigChange[],
): Promise<MatriculaFieldConfig> {
  let lastRow: MatriculaFieldConfigRow | undefined

  for (const { fkCampo, patch } of changes) {
    const { config } = await evalCol.putRow<{ config: MatriculaFieldConfigRow }>(
      `/matricula/configuracion/campo/${fkCampo}`,
      patch,
    )
    lastRow = config
  }

  if (!lastRow) {
    throw new Error("No hay cambios para guardar.")
  }
  return toMatriculaFieldConfig(lastRow)
}

interface UseUpdateMatriculaFieldConfigOptions {
  mutationConfig?: MutationConfig<typeof updateMatriculaFieldConfig>
}

export function useUpdateMatriculaFieldConfig({
  mutationConfig,
}: UseUpdateMatriculaFieldConfigOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: updateMatriculaFieldConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: matriculaFieldConfigQueryKey() })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
