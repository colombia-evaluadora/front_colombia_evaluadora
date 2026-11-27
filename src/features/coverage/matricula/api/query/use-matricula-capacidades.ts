import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { evalCol } from "@/lib/eval-col-client"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"

interface CapacidadesRow {
  cambiar_grado: "S" | "N"
  reactivar: "S" | "N"
  operar?: "S" | "N"
}

export interface MatriculaCapacidades {
  cambiarGrado: boolean
  reactivar: boolean
  /** Retirar, reingresar y cambiar de grupo (también el Supervisor de sede). */
  operar: boolean
}

/**
 * Acciones que el rol puede usar en la vista (manual §2): Cambiar de grado y
 * Reactivar son del Administrador y el Gestor del establecimiento, no del
 * Supervisor de sede; Retirar, Reingresar y Cambiar de grupo sí (operar). Mientras carga, se ocultan; si el endpoint falla (o con
 * mocks), se muestran: cada acción la vuelve a validar su gate en el back.
 */
export const fetchMatriculaCapacidades = async () =>
  (await evalCol.getRows<CapacidadesRow>("/cobertura-academica/matricula/capacidades"))[0] ?? null

export function useMatriculaCapacidades(): MatriculaCapacidades {
  const { data, isError } = useQuery({
    queryKey: matriculaKeys.capacidades,
    queryFn: fetchMatriculaCapacidades,
    enabled: !env.ENABLE_API_MOCKING,
    staleTime: Infinity,
  })
  if (env.ENABLE_API_MOCKING || isError) return { cambiarGrado: true, reactivar: true, operar: true }
  return { cambiarGrado: data?.cambiar_grado === "S", reactivar: data?.reactivar === "S", operar: data?.operar === "S" }
}
