import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import {
  toMatriculaFieldConfig,
  type MatriculaFieldConfigRow,
} from "@/features/coverage/matricula/api/query/use-matricula-field-config-query"
import type {
  MatriculaConfigCampoPatch,
  MatriculaFieldConfig,
} from "@/features/coverage/matricula/api/types/matricula"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"

export interface MatriculaFieldConfigChange {
  fkCampo: number
  patch: MatriculaConfigCampoPatch
}

// El PUT acepta un campo por llamada: se mandan en serie y vale la última respuesta.
interface UpdateMatriculaFieldConfigInput {
  /** El colegio cuya configuración se edita; `null` = el único que administra. */
  establecimientoId: number | null
  changes: MatriculaFieldConfigChange[]
}

async function updateMatriculaFieldConfig({
  establecimientoId,
  changes,
}: UpdateMatriculaFieldConfigInput): Promise<MatriculaFieldConfig> {
  let lastRow: MatriculaFieldConfigRow | undefined

  for (const { fkCampo, patch } of changes) {
    const { config } = await evalCol.putRow<{ config: MatriculaFieldConfigRow }>(
      `/matricula/configuracion/campo/${fkCampo}`,
      { ...patch, FK_ESTABLECIMIENTO: establecimientoId },
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
      queryClient.invalidateQueries({ queryKey: matriculaKeys.fieldConfigAll })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
