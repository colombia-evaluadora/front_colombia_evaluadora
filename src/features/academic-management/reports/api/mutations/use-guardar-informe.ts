import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { informeGrupoQueryKeyPrefix } from "@/features/academic-management/reports/api/query/use-informe-grupo-query"
import type {
  DetalleGuardado,
  ResultadoGuardado,
} from "@/features/academic-management/reports/api/types"

interface DetalleRow {
  fk_tmatricula: number
  estudiante: string
  resultado: ResultadoGuardado
  anterior: number | null
  nota_anterior: number | null
  promedio: number | null
  promedio_periodo: number | null
  aprobadas: number | null
  reprobadas: number | null
}

export function toDetalleGuardado(row: DetalleRow): DetalleGuardado {
  return {
    matriculaId: row.fk_tmatricula,
    estudiante: row.estudiante,
    resultado: row.resultado,
    notaAnterior: row.nota_anterior ?? row.anterior,
    promedio: row.promedio ?? row.promedio_periodo,
    aprobadas: row.aprobadas,
    reprobadas: row.reprobadas,
  }
}

export interface GuardarInformeInput {
  grupoId: number
  /** Un solo período por llamada: consolidar es un acto puntual. */
  periodoId: number
  /** Vacío = todo el grupo. */
  matriculas?: number[]
}

async function guardarInforme(input: GuardarInformeInput): Promise<DetalleGuardado[]> {
  const rows = await evalCol.postRows<DetalleRow>("/informes/guardar", {
    FK_TGRUPO: input.grupoId,
    FK_TPERIODO_EVALUACION: input.periodoId,
    MATRICULAS: input.matriculas?.length ? input.matriculas : null,
  })
  return rows.map(toDetalleGuardado)
}

/** `POST /informes/guardar` — el paso de gris a negro del informe completo.
 *  Idempotente: lo que no cambió vuelve como `sin_cambio` y no se escribe. */
export function useGuardarInformeMutation({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof guardarInforme> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: guardarInforme,
    onSuccess: (result, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: informeGrupoQueryKeyPrefix() })
      queryClient.invalidateQueries({ queryKey: ["informes", "historial"] })
      queryClient.invalidateQueries({ queryKey: ["informes", "cambios-pendientes"] })
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}
