import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { informeGrupoQueryKeyPrefix } from "@/features/academic-management/reports/api/query/use-informe-grupo-query"
import { planillaInformeQueryKeyPrefix } from "@/features/academic-management/reports/api/query/use-planilla-informe-query"
import type {
  DetalleGuardado,
  ResultadoGuardado,
} from "@/features/academic-management/reports/api/types"

interface DetalleRow {
  fk_tmatricula: number
  estudiante: string
  resultado: ResultadoGuardado
  nota_anterior: number | null
  promedio_periodo: number | null
  aprobadas: number | null
  reprobadas: number | null
}

export interface GuardarPlanillaInput {
  grupoId: number
  asignaturaId: number
  periodoId: number
  /** Vacío = todo el grupo. */
  matriculas?: number[]
}

async function guardarPlanilla(input: GuardarPlanillaInput): Promise<DetalleGuardado[]> {
  const rows = await evalCol.postRows<DetalleRow>("/informes/planilla/guardar", {
    FK_TGRUPO: input.grupoId,
    FK_TASIGNATURA: input.asignaturaId,
    FK_TPERIODO_EVALUACION: input.periodoId,
    MATRICULAS: input.matriculas?.length ? input.matriculas : null,
  })
  return rows.map((row) => ({
    matriculaId: row.fk_tmatricula,
    estudiante: row.estudiante,
    resultado: row.resultado,
    notaAnterior: row.nota_anterior,
    promedio: row.promedio_periodo,
    aprobadas: row.aprobadas,
    reprobadas: row.reprobadas,
  }))
}

/** `POST /informes/planilla/guardar` — congela una sola asignatura. Convive
 *  con `/informes/guardar` sin pisarlo: `TASIGNATURA_NOTA` es por
 *  (matrícula, período, asignatura) y ambos recalculan las mismas métricas. */
export function useGuardarPlanillaMutation({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof guardarPlanilla> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: guardarPlanilla,
    onSuccess: (result, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: planillaInformeQueryKeyPrefix() })
      queryClient.invalidateQueries({ queryKey: informeGrupoQueryKeyPrefix() })
      queryClient.invalidateQueries({ queryKey: ["informes", "cambios-pendientes"] })
      queryClient.invalidateQueries({ queryKey: ["informes", "historial"] })
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}
