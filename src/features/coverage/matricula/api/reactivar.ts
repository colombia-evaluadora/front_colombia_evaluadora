import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"
import { invalidarMatriculas, matriculaKeys } from "@/features/coverage/matricula/api/query-keys"

// Reactivar (Sección 4.4, Regla 15): devuelve a Cursando un estado final puesto
// por error. La previa dice si se puede y qué pasa con la matrícula nueva del
// cambio de grado.

/** Estados finales que se reactivan; Anulado, Graduado y el resto no. */
export const ESTADOS_REACTIVABLES = ["Promovido", "Promovido Anticipadamente", "Reubicado", "Aprobado", "Reprobado"]

export type DecisionRegistros = "HOMOLOGAR" | "DESCARTAR"

export interface PreviaReactivar {
  periodoAbierto: boolean
  promovidoAreasPendientes: boolean
  tieneMatriculaSiguiente: boolean
  /** La del período siguiente que impide reactivar. */
  matriculaSiguiente: { periodo: string; grado: number; grupo: string; estado: string } | null
  tieneComplementaria: boolean
  /** Solo en Promovida o Reubicada: la matrícula que creó el cambio de grado y que pasa a Anulado. */
  matriculaNueva: {
    grado: number
    grupo: string
    registrosPropios: boolean
    registros: { actividades: number; clases: number } | null
  } | null
}

interface PreviaRow {
  periodo_abierto: boolean
  promovido_areas_pendientes: boolean
  tiene_matricula_siguiente: boolean
  matricula_siguiente: { periodo: string; grado: number; grupo: string; estado: string } | null
  tiene_complementaria: boolean
  matricula_nueva: {
    grado: number
    grupo: string
    registros_propios: boolean
    registros: { actividades: number; clases: number } | null
  } | null
}

const toPrevia = (r: PreviaRow): PreviaReactivar => ({
  periodoAbierto: r.periodo_abierto,
  promovidoAreasPendientes: r.promovido_areas_pendientes,
  tieneMatriculaSiguiente: r.tiene_matricula_siguiente,
  matriculaSiguiente: r.matricula_siguiente ?? null,
  tieneComplementaria: r.tiene_complementaria,
  matriculaNueva: r.matricula_nueva
    ? {
        grado: r.matricula_nueva.grado,
        grupo: r.matricula_nueva.grupo,
        registrosPropios: r.matricula_nueva.registros_propios,
        registros: r.matricula_nueva.registros,
      }
    : null,
})

export function usePreviaReactivarQuery(matriculaId: string) {
  return useQuery({
    queryKey: matriculaKeys.previaReactivar(matriculaId),
    queryFn: async () => {
      const row = await evalCol.getRow<{ previa: PreviaRow }>(
        `/cobertura-academica/matricula/${matriculaId}/reactivar/previa`,
      )
      return toPrevia(row.previa)
    },
    staleTime: 0,
  })
}

export interface ReactivarInput {
  matriculaId: string
  motivo: string
  soporte: File | null
  /** Solo si la matrícula nueva tiene registros propios. */
  decision: DecisionRegistros | null
}

async function reactivarMatricula(input: ReactivarInput) {
  await postMultipart(
    `/eval-col/cobertura-academica/matricula/${input.matriculaId}/reactivar`,
    { MOTIVO: input.motivo.trim(), REGISTROS_NUEVA: input.decision },
    { SOPORTE: input.soporte },
  )
}

export function useReactivarMatricula() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reactivarMatricula,
    onSuccess: () => invalidarMatriculas(queryClient),
  })
}
