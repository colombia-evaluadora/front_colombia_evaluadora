import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

/** Fila de `GET /planeador/planillas-auxiliares/grupos` (sso `fn_planilla_auxiliar_grupos`). */
export interface PlanillaAuxiliarGrupo {
  pk_tgrupo: number
  grado_grupo: string
  sede_nombre: string | null
  jornada: string | null
  /** Rótulo del [Área] del referente del nivel (p. ej. «Dimensión»). */
  rotulo_area: string
  modo_asistencia: "POR_CLASE" | "DIARIA" | null
  /** Solo las que el usuario puede ver (docente: su carga en el grupo). */
  areas: { pk_tasignatura: number; nombre: string }[]
  periodos: { pk_tperiodo_evaluacion: number; nombre: string; fecha_inicio: string; fecha_fin: string; en_curso: boolean }[]
}

/** Grupos del alcance del usuario para el modal Planillas auxiliares (Regla 96). */
export function usePlanillasAuxiliaresGruposQuery(enabled: boolean) {
  return useQuery({
    queryKey: planeadorKeys.planillasAuxiliaresGrupos,
    queryFn: () => evalCol.getRows<PlanillaAuxiliarGrupo>("/planeador/planillas-auxiliares/grupos"),
    enabled,
  })
}
