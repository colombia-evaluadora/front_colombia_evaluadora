import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

export interface InformeInclusion {
  vigentes_total: number
  vigentes_con_ajustes: number
  por_grado: { fk_tgrado: number; grado_nombre: string; vigentes: number; borradores: number; revision_concluida: number; cerrados: number }[]
  cobertura: { fk_tasignatura: number; asignatura_nombre: string; con_ajustes: number; sin_ajustes: number; pendiente_revision: number }[]
  seguimiento: { fk_tasignatura: number | null; asignatura_nombre: string; con_seguimiento: number; sin_seguimiento: number }[]
  barreras: { nombre: string; ajustes: number }[]
}

export function useInformeQuery(params: { establecimiento: number | null | undefined; sede: string; anio: string; grado: string }) {
  return useQuery({
    queryKey: ["inclusion", "informe", params],
    queryFn: () => {
      const q = new URLSearchParams({ FK_ESTABLECIMIENTO: String(params.establecimiento) })
      if (params.sede) q.set("FK_SEDE", params.sede)
      if (params.anio) q.set("ANIO", params.anio)
      if (params.grado) q.set("FK_GRADO", params.grado)
      return evalCol.getRow<{ resultado: InformeInclusion }>(`/gestion-estudiantil/inclusion/informe?${q}`).then((r) => r.resultado)
    },
    enabled: params.establecimiento != null,
    staleTime: 60_000,
  })
}
