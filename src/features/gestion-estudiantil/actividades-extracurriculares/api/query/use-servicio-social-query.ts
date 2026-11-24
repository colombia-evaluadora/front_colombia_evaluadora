import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { actividadesKeys } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query-keys"
import type { PaginaParams } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-actividades-query"
import type {
  ParametrosServicioSocial,
  ServicioSocialDetalle,
  ServicioSocialFiltros,
  ServicioSocialQueryFilters,
  ServicioSocialRow,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"

export const BASE_SERVICIO_SOCIAL = "/gestion-estudiantil/servicio-social"

const id = (value: string) => (value ? Number(value) : null)

export function toServicioSocialFilters(search: string, f: ServicioSocialFiltros): ServicioSocialQueryFilters {
  return {
    SEDE: id(f.sede),
    JORNADA: id(f.jornada),
    GRADO_LV: id(f.grado),
    ESTADO: f.estado || null,
    SEARCH: search.trim() || null,
  }
}

/** Algunas salidas llegan en una columna JSON (`datos`) y otras como fila plana: se acepta cualquiera. */
function datosOFila<T>(fila: Record<string, unknown> | undefined, vacio: string): T {
  if (!fila) throw new Error(vacio)
  return ("datos" in fila ? desenvolver<T>(fila, "datos", vacio) : fila) as T
}

export const fetchServicioSocial = async (params: PaginaParams<ServicioSocialQueryFilters>) => {
  const rows = await evalCol.getRows<ServicioSocialRow>(
    `${BASE_SERVICIO_SOCIAL}${queryString({ ...params.filters, PAGEINDEX: params.pageIndex, PAGESIZE: params.pageSize })}`,
  )
  const totalCount = Number(rows[0]?.total_count ?? 0)
  return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
}

/** `GET /servicio-social`: un estudiante por fila (id = matrícula). */
export function useServicioSocialQuery(params: PaginaParams<ServicioSocialQueryFilters>) {
  return useQuery({
    queryKey: actividadesKeys.servicioSocial.lista(params),
    queryFn: () => fetchServicioSocial(params),
    enabled: params.filters != null,
    retry: false,
    placeholderData: (prev) => prev,
  })
}

export const fetchServicioSocialEstudiante = (matricula: number | undefined) =>
  evalCol
    .getRows<Record<string, unknown>>(`${BASE_SERVICIO_SOCIAL}/estudiante/${matricula}`)
    .then((r) => datosOFila<ServicioSocialDetalle>(r[0], "No se encontró el estudiante."))

/** `GET /servicio-social/estudiante/:MATRICULA`. */
export function useServicioSocialEstudianteQuery(matricula: number | undefined) {
  return useQuery({
    queryKey: actividadesKeys.servicioSocial.estudiante(matricula ?? "none"),
    queryFn: () => fetchServicioSocialEstudiante(matricula),
    enabled: matricula != null,
    retry: false,
  })
}

export const fetchParametrosServicioSocial = () =>
  evalCol.getRows<Record<string, unknown>>(`${BASE_SERVICIO_SOCIAL}/parametros`).then((r) => {
    const fila = r[0]
    if (!fila) return { grados: [] } as ParametrosServicioSocial
    if ("grados" in fila) {
      const g = fila.grados
      return { grados: typeof g === "string" ? JSON.parse(g) : (g ?? []) } as ParametrosServicioSocial
    }
    return datosOFila<ParametrosServicioSocial>(fila, "")
  })

/** `GET /servicio-social/parametros`: grados donde se cumple el servicio social. */
export function useParametrosServicioSocialQuery(enabled = true) {
  return useQuery({
    queryKey: actividadesKeys.servicioSocial.parametros,
    queryFn: fetchParametrosServicioSocial,
    enabled,
    staleTime: 5 * 60_000,
  })
}
