import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { useSedeJornadasActivasQuery } from "@/features/establishment/employees/api/query/use-sede-jornadas"
import { useSedeOptionsQuery } from "@/features/establishment/academic-period/api/query/use-sede-options"
import { usePeriodoResolverMatriculaQuery } from "@/features/coverage/api/query/use-periodo-resolver-matricula"
import type {
  MatriculaDependentCatalogsRequest,
  MatriculaDependentCatalogsResponse,
  MatriculaGradoOption,
  MatriculaGrupoOption,
} from "@/features/coverage/api/types/matricula"


const CATALOG_PAGE_SIZE = 200

interface GradoRow {
  id: number
  nombre: string
  codigo?: number | string
  total_count: number
}
interface GradosRawResponse {
  rows: GradoRow[]
}

async function fetchGrados(periodoId: number): Promise<(MatriculaGradoOption & { id: number })[]> {
  const raw: GradosRawResponse = await api.query(`/eval-col/grados/query/${periodoId}`, {
    FILTRO: null,
    PAGE_INDEX: 0,
    PAGE_SIZE: CATALOG_PAGE_SIZE,
    SORTING_ID: null,
    SORTING_DESC: null,
  })
  return (raw.rows ?? [])
    .map((row) => ({ id: row.id, nombre: row.nombre, valor: Number(row.codigo) }))
    .filter((row) => !Number.isNaN(row.valor))
    .sort((a, b) => a.valor - b.valor)
}

interface GrupoRow {
  id: number
  codigo: string
  jornada_name: string
  total_count: number
}
interface GruposRawResponse {
  rows: GrupoRow[]
}

async function fetchGrupos(gradoId: number, jornadaName?: string): Promise<MatriculaGrupoOption[]> {
  const raw: GruposRawResponse = await api.post(`/eval-col/grados/${gradoId}/grupos/query`, {
    PAGE_INDEX: "0",
    PAGE_SIZE: String(CATALOG_PAGE_SIZE),
  })
  let rows = raw.rows ?? []
  if (jornadaName) {
    rows = rows.filter((row) => row.jornada_name === jornadaName)
  }
  return rows.map((row) => ({ id: row.id, codigo: row.codigo }))
}


export function useMatriculaDependentCatalogsQuery(params: MatriculaDependentCatalogsRequest) {
  const { campus, shift, grade } = params

  const { data: sedes } = useSedeOptionsQuery()
  const sedeId = campus ? sedes?.find((sede) => sede.nombre === campus)?.pk_sede : undefined

  const { data: jornadasActivas } = useSedeJornadasActivasQuery(sedeId ?? null)
  const shifts = (jornadasActivas ?? []).map((jornada) => jornada.nombre)
  const jornadaId = shift ? jornadasActivas?.find((j) => j.nombre === shift)?.id : undefined

  const { data: periodoId } = usePeriodoResolverMatriculaQuery(sedeId ?? null, jornadaId ?? null)

  const gradosQuery = useQuery({
    queryKey: ["matricula", "grados-por-periodo", periodoId],
    queryFn: () => fetchGrados(periodoId as number),
    enabled: periodoId != null,
    staleTime: 30_000,
  })
  const grados = gradosQuery.data ?? []
  const grades: MatriculaGradoOption[] = grados.map(({ id: _id, ...grado }) => grado)

  const gradoId = grade != null ? grados.find((g) => g.valor === grade)?.id : undefined

  const gruposQuery = useQuery({
    queryKey: ["matricula", "grupos-por-grado", gradoId, shift],
    queryFn: () => fetchGrupos(gradoId as number, shift),
    enabled: gradoId != null,
    staleTime: 30_000,
  })

  return {
    isPending: gradosQuery.isPending || gruposQuery.isPending,
    data: {
      shifts,
      grades,
      groups: gruposQuery.data ?? [],
    } as MatriculaDependentCatalogsResponse,
  }
}
