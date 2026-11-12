import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"
import type { MatriculaAsignatura } from "@/features/coverage/matricula/api/types/matricula"

interface AsignaturaRow {
  fk_tasignatura: number
  asignatura: string
  matricula_obligatoria: string
  matriculada: string
  cursa_externa: string
  tiene_registros: boolean
  media_tecnica_externa?: string
  institucion_externa?: string | null
}

const toAsignatura = (row: AsignaturaRow): MatriculaAsignatura => ({
  id: row.fk_tasignatura,
  nombre: row.asignatura,
  obligatoria: row.matricula_obligatoria === "S",
  matriculada: row.matriculada === "S",
  externa: row.cursa_externa === "S",
  tieneRegistros: Boolean(row.tiene_registros),
})

export interface MatriculaAsignaturasData {
  asignaturas: MatriculaAsignatura[]
  mediaTecnicaExterna: boolean
  institucionExterna: string
}

/** Bloque 15 de una matrícula ya creada (fn_matricula_asignaturas_listar). */
export function useMatriculaAsignaturasQuery(matriculaId: string | undefined) {
  return useQuery({
    queryKey: matriculaKeys.asignaturas(matriculaId),
    queryFn: async (): Promise<MatriculaAsignaturasData> => {
      const rows = await evalCol.getRows<AsignaturaRow>(`/cobertura-academica/matricula/${matriculaId}/asignaturas`)
      // La media técnica viene repetida en cada fila; sin plan no hay filas.
      return {
        asignaturas: rows.map(toAsignatura),
        mediaTecnicaExterna: rows[0]?.media_tecnica_externa === "S",
        institucionExterna: rows[0]?.institucion_externa ?? "",
      }
    },
    enabled: Boolean(matriculaId),
  })
}

/** Plan del grado del grupo para el alta: las obligatorias vienen matriculadas (Regla 64). */
export function useMatriculaAsignaturasPlanQuery(grupoId: number | null) {
  return useQuery({
    queryKey: matriculaKeys.asignaturasPlan(grupoId),
    queryFn: async () => {
      const rows = await evalCol.getRows<AsignaturaRow>(
        `/cobertura-academica/matricula/asignaturas-plan?GRUPO=${grupoId}`,
      )
      return rows.map(toAsignatura)
    },
    enabled: grupoId != null,
  })
}

