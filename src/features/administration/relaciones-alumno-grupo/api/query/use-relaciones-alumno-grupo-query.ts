import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { relacionesAlumnoGrupoKeys } from "@/features/administration/relaciones-alumno-grupo/api/query-keys"
import type {
  RelacionAlumnoGrupo,
  RelacionesAlumnoGrupo,
} from "@/features/administration/relaciones-alumno-grupo/api/types"
import type { Resultado } from "@/features/administration/listas-valor/api/types/lista-valor"

interface RelacionesRow {
  relaciones: RelacionAlumnoGrupo[]
  niveles: { pkNivel: number; nivel: string }[]
  zonas: { pkZona: number; zona: string }[]
}

async function fetchRelaciones(): Promise<RelacionesAlumnoGrupo> {
  const [row] = await evalCol.getRows<Resultado<RelacionesRow>>("/relaciones-alumno-grupo")
  const r = row?.resultado
  return {
    relaciones: r?.relaciones ?? [],
    niveles: (r?.niveles ?? []).map((n) => ({ value: String(n.pkNivel), label: n.nivel })),
    zonas: (r?.zonas ?? []).map((z) => ({ value: String(z.pkZona), label: z.zona })),
  }
}

export function useRelacionesAlumnoGrupoQuery() {
  return useQuery({ queryKey: relacionesAlumnoGrupoKeys.all, queryFn: fetchRelaciones })
}
