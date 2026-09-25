import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { informeGrupoQueryKeyPrefix } from "@/features/academic-management/reports/api/query/use-informe-grupo-query"
import type { ConsolidacionEstudiante } from "@/features/academic-management/reports/api/types"

/**
 * Las columnas de `fn_informe_periodo_guardar`, tal cual. Antes esto
 * declaraba un `resultado` que la función NO devuelve —es de la planilla,
 * que consolida una sola asignatura—, así que llegaba `undefined` y el
 * conteo de la pantalla daba cero aunque se hubiera guardado todo.
 */
interface DetalleRow {
  fk_tmatricula: number
  estudiante: string | null
  guardadas: number | string | null
  actualizadas: number | string | null
  sin_proyeccion: number | string | null
  sin_cambio: number | string | null
  promedio: number | string | null
  aprobadas: number | string | null
  reprobadas: number | string | null
}

// Los BIGINT/NUMERIC de Postgres pueden llegar como texto: se normalizan acá
// para que quien cuente no tenga que acordarse.
const numero = (valor: number | string | null): number => Number(valor ?? 0) || 0

export function toConsolidacion(row: DetalleRow): ConsolidacionEstudiante {
  return {
    matriculaId: row.fk_tmatricula,
    estudiante: row.estudiante ?? "",
    guardadas: numero(row.guardadas),
    actualizadas: numero(row.actualizadas),
    sinProyeccion: numero(row.sin_proyeccion),
    sinCambio: numero(row.sin_cambio),
    promedio: row.promedio == null ? null : Number(row.promedio),
    aprobadas: row.aprobadas == null ? null : Number(row.aprobadas),
    reprobadas: row.reprobadas == null ? null : Number(row.reprobadas),
  }
}

export interface GuardarInformeInput {
  grupoId: number
  /** Un solo período por llamada: consolidar es un acto puntual. */
  periodoId: number
  /** Vacío = todo el grupo. */
  matriculas?: number[]
}

async function guardarInforme(
  input: GuardarInformeInput,
): Promise<ConsolidacionEstudiante[]> {
  const rows = await evalCol.postRows<DetalleRow>("/informes/guardar", {
    FK_TGRUPO: input.grupoId,
    FK_TPERIODO_EVALUACION: input.periodoId,
    MATRICULAS: input.matriculas?.length ? input.matriculas : null,
  })
  return rows.map(toConsolidacion)
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
