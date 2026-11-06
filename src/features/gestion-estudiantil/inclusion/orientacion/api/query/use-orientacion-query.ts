import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { orientacionKeys } from "@/features/gestion-estudiantil/inclusion/orientacion/api/query-keys"
import type { AtencionDetalle, AtencionRow, MiRemisionRow, OrientacionFiltros, RemisionRow } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"

const BASE = "/gestion-estudiantil/orientacion"
const id = (v: string) => (v ? Number(v) : null)

interface Params {
  search: string
  filtros: OrientacionFiltros
  pageIndex: number
  pageSize: number
}

async function listar<T extends { total_count: number }>(ruta: string, filters: unknown, pageIndex: number, pageSize: number) {
  const rows = await evalCol.postRows<T>(`${BASE}/${ruta}/query`, { FILTERS: filters, PAGEINDEX: pageIndex, PAGESIZE: pageSize })
  const totalCount = rows[0]?.total_count ?? 0
  return { rows, totalCount, pageCount: toPageCount(totalCount, pageSize) }
}

const comunes = ({ search, filtros }: Params) => ({ SEARCH: search.trim() || null, FK_SEDE: id(filtros.sede), FK_JORNADA: id(filtros.jornada), FK_MOTIVO: id(filtros.motivo) })

export function useRemisionesQuery(p: Params) {
  return useQuery({
    queryKey: orientacionKeys.lista("remisiones", p),
    queryFn: () => listar<RemisionRow>("remisiones", { ...comunes(p), FK_ESTADO: id(p.filtros.estado), FK_MATRICULA: null }, p.pageIndex, p.pageSize),
    placeholderData: keepPreviousData,
  })
}

export function useAtencionesQuery(p: Params) {
  return useQuery({
    queryKey: orientacionKeys.lista("atenciones", p),
    queryFn: () => listar<AtencionRow>("atenciones", { ...comunes(p), FK_MODALIDAD: id(p.filtros.modalidad), FK_ORIGEN: id(p.filtros.origen) }, p.pageIndex, p.pageSize),
    placeholderData: keepPreviousData,
  })
}

/** Remisiones del estudiante elegido, para «Remisión de origen». */
export function useRemisionesDeQuery(matricula: string) {
  return useQuery({
    queryKey: orientacionKeys.remisionesDe(matricula),
    queryFn: () => listar<RemisionRow>("remisiones", { SEARCH: null, FK_SEDE: null, FK_JORNADA: null, FK_MOTIVO: null, FK_ESTADO: null, FK_MATRICULA: Number(matricula) }, 0, 50).then((r) => r.rows),
    enabled: Boolean(matricula),
  })
}

/** G.1.REP.3: solo las propias y su estado (Regla 1). */
export function useMisRemisionesQuery(p: { estado: string; pageIndex: number; pageSize: number }) {
  return useQuery({
    queryKey: orientacionKeys.lista("mis-remisiones", p),
    queryFn: async () => {
      const q = new URLSearchParams({ PAGEINDEX: String(p.pageIndex), PAGESIZE: String(p.pageSize) })
      if (p.estado) q.set("FK_ESTADO", p.estado)
      const rows = await evalCol.getRows<MiRemisionRow>(`/gestion-estudiantil/observador/mis-remisiones?${q}`)
      const totalCount = rows[0]?.total_count ?? 0
      return { rows, totalCount, pageCount: toPageCount(totalCount, p.pageSize) }
    },
    placeholderData: keepPreviousData,
  })
}

export function useAtencionQuery(atencionId: number | undefined) {
  return useQuery({
    queryKey: orientacionKeys.atencion(atencionId ?? 0),
    queryFn: () => evalCol.getRow<{ resultado: AtencionDetalle }>(`${BASE}/atenciones/${atencionId}`).then((r) => r.resultado),
    enabled: atencionId != null,
  })
}

/** Matrículas Cursando del alcance, tengan o no PIAR (`TODAS`, V603). */
export function useEstudiantesAtencionQuery(search: string, enabled: boolean) {
  return useQuery({
    queryKey: orientacionKeys.estudiantes(search),
    queryFn: () =>
      evalCol.getRows<{ fk_tmatricula: number; estudiante_nombre: string; grado_grupo: string }>(
        `/gestion-estudiantil/inclusion/piar/matriculas-disponibles?TODAS=true${search ? `&SEARCH=${encodeURIComponent(search)}` : ""}`,
      ),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
