import { useAccesoPrevencionQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-parametros-indicadores-query"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"

/** Entrada a «Consultar historial académico»: habilitada solo con `puede_historial_academico` de `GET /acceso`. */
export function useEntradaHistorialAcademico(matricula: number) {
  const { establecimientoId } = useAmbitoPrevencion("")
  const acceso = useAccesoPrevencionQuery(establecimientoId)
  const { irHistorialAcademico } = useNavegacionPrevencion()
  return { habilitada: acceso.data?.puede_historial_academico === true, abrir: () => irHistorialAcademico(matricula) }
}
