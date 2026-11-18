import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { invalidarMatriculas, matriculaKeys } from "@/features/coverage/matricula/api/query-keys"

// Agregar matrícula complementaria del estudiante propio (Sección 2.16, C.1.COM.1).
// Pendiente en el back (docs/matricula/pendientes-back.md, tarea 11).

export interface GrupoComplementaria {
  id: number
  codigo: string
  cupo: number
  libres: number
}

export interface PeriodoComplementaria {
  id: number
  label: string
  jornada: string
  /** Puestos comprometidos con la convocatoria (no se cuentan como libres). */
  comprometidos: number
  grupos: GrupoComplementaria[]
}

export interface SedeComplementaria {
  id: number
  nombre: string
  periodos: PeriodoComplementaria[]
}

export interface PreviaComplementaria {
  establecimiento: string
  especialidad: string
  sedes: SedeComplementaria[]
}

interface PreviaRow {
  establecimiento: string
  especialidad: string
  sedes: SedeComplementaria[]
}

const url = (matriculaId: string) => `/cobertura-academica/matricula/${matriculaId}/complementaria`

export function usePreviaComplementariaQuery(matriculaId: string) {
  return useQuery({
    queryKey: [...matriculaKeys.detalle(matriculaId), "complementaria"],
    queryFn: async (): Promise<PreviaComplementaria> => {
      const row = await evalCol.getRow<PreviaRow>(`${url(matriculaId)}/previa`)
      return { establecimiento: row.establecimiento, especialidad: row.especialidad, sedes: row.sedes ?? [] }
    },
    staleTime: 0,
  })
}

export function useAgregarComplementaria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ matriculaId, sedeId, periodoId, grupoId }: { matriculaId: string; sedeId: number; periodoId: number; grupoId: number }) =>
      evalCol.postRow<{ pk_matricula: number }>(url(matriculaId), {
        FK_TSEDE: sedeId,
        FK_TPERIODO_ACADEMICO: periodoId,
        FK_TGRUPO: grupoId,
      }),
    onSuccess: () => invalidarMatriculas(queryClient),
  })
}
