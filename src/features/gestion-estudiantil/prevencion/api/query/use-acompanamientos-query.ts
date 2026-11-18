import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import type {
  AcompanamientoDetalle,
  AcompanamientoRow,
  AcompanamientosFiltros,
  AcompanamientosQueryFilters,
  AcompHistorialRow,
  ContextoAcompanamiento,
  OpcionAcompAbierto,
  OpcionAtencionAcomp,
  OpcionResponsable,
  ReporteConsumoDetalle,
  ReporteConsumoRow,
  ReportesConsumoFiltros,
  ReportesConsumoQueryFilters,
  TipoAcompanamiento,
} from "@/features/gestion-estudiantil/prevencion/api/types"

export const BASE_ACOMPANAMIENTOS = `${BASE_PREVENCION}/acompanamientos`

const id = (value: string) => (value ? Number(value) : null)

export function toAcompanamientosFilters(
  establecimiento: number,
  tipo: TipoAcompanamiento,
  search: string,
  f: AcompanamientosFiltros,
): AcompanamientosQueryFilters {
  return {
    ESTABLECIMIENTO: establecimiento,
    TIPO: tipo,
    SEDE: id(f.sede),
    JORNADA: id(f.jornada),
    RESPONSABLE: id(f.responsable),
    ESTADO: f.estado || null,
    SEARCH: search.trim() || null,
  }
}

export function toReportesConsumoFilters(
  establecimiento: number,
  search: string,
  f: ReportesConsumoFiltros,
): ReportesConsumoQueryFilters {
  return {
    ESTABLECIMIENTO: establecimiento,
    SEDE: id(f.sede),
    JORNADA: id(f.jornada),
    ESTADO: f.estado || null,
    SEARCH: search.trim() || null,
  }
}

interface ParamsPaginados<F> {
  filters: F | null
  pageIndex: number
  pageSize: number
}

async function paginado<T extends { total_count: number }>(url: string, filters: object | null, pageIndex: number, pageSize: number) {
  const rows = await evalCol.getRows<T>(
    `${url}${queryString({ ...(filters as Record<string, string | number | null>), PAGEINDEX: pageIndex, PAGESIZE: pageSize })}`,
  )
  const totalCount = Number(rows[0]?.total_count ?? 0)
  return { rows, totalCount, pageCount: toPageCount(totalCount, pageSize) }
}

/** `GET /acompanamientos?TIPO=`: pestañas Embarazo y Consumo, más recientes primero; `total_count` en cada fila. */
export function useAcompanamientosQuery(params: ParamsPaginados<AcompanamientosQueryFilters>) {
  return useQuery({
    queryKey: prevencionKeys.acompanamientos(params),
    queryFn: () => paginado<AcompanamientoRow>(BASE_ACOMPANAMIENTOS, params.filters, params.pageIndex, params.pageSize),
    enabled: params.filters != null,
    retry: false,
    placeholderData: (prev) => prev,
  })
}

/** `GET /acompanamientos/:ID` → `datos`. Abrirlo deja traza de consulta (Regla 21): no se cachea. */
export function useAcompanamientoQuery(acompId: number | undefined) {
  return useQuery({
    queryKey: prevencionKeys.acompanamiento(acompId ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_ACOMPANAMIENTOS}/${acompId}`)
        .then((r) => desenvolver<AcompanamientoDetalle>(r[0], "datos", "No se encontró el acompañamiento.")),
    enabled: acompId != null,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  })
}

/** `GET /acompanamientos/estudiantes/:MATRICULA/historial`: «Ver historial» del aviso de duplicado (incluye Cerrados y Anulados). */
export function useAcompHistorialQuery(matricula: number | undefined, tipo: TipoAcompanamiento | null, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.acompHistorial(matricula ?? "none", tipo),
    queryFn: () =>
      evalCol.getRows<AcompHistorialRow>(
        `${BASE_ACOMPANAMIENTOS}/estudiantes/${matricula}/historial${queryString({ TIPO: tipo })}`,
      ),
    enabled: enabled && matricula != null,
    retry: false,
  })
}

/** `GET /acompanamientos/opciones/atenciones`: selector Atención de origen (solo orientación). */
export function useOpcionesAtencionesAcompQuery(matricula: number | undefined, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.opciones.acompAtenciones(matricula ?? "none"),
    queryFn: () =>
      evalCol.getRows<OpcionAtencionAcomp>(`${BASE_ACOMPANAMIENTOS}/opciones/atenciones${queryString({ MATRICULA: matricula })}`),
    enabled: enabled && matricula != null,
    staleTime: 60_000,
  })
}

export interface OpcionesResponsablesAcompParams {
  matricula: number | undefined
  /** true: Responsable del expediente (Profesional de orientación); false: responsable de una acción. */
  soloOrientacion: boolean
  search?: string
}

/** `GET /acompanamientos/opciones/responsables`: de la sede y jornada de la matrícula; el usuario va primero. */
export function useOpcionesResponsablesAcompQuery(params: OpcionesResponsablesAcompParams, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.opciones.acompResponsables(params),
    queryFn: () =>
      evalCol.getRows<OpcionResponsable>(
        `${BASE_ACOMPANAMIENTOS}/opciones/responsables${queryString({
          MATRICULA: params.matricula,
          SOLO_ORIENTACION: params.soloOrientacion,
          SEARCH: params.search?.trim() || null,
          PAGESIZE: 50,
        })}`,
      ),
    enabled: enabled && params.matricula != null,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

/** `GET /acompanamientos/consumo/opciones/abiertos`: acompañamientos de consumo abiertos del estudiante (Vincular reporte). */
export function useOpcionesAcompAbiertosQuery(matricula: number | undefined, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.opciones.acompAbiertos(matricula ?? "none"),
    queryFn: () =>
      evalCol.getRows<OpcionAcompAbierto>(
        `${BASE_ACOMPANAMIENTOS}/consumo/opciones/abiertos${queryString({ MATRICULA: matricula })}`,
      ),
    enabled: enabled && matricula != null,
    retry: false,
  })
}

/** `GET /acompanamientos/consumo/reportes`: vista Reportes recibidos (solo orientación). */
export function useReportesConsumoQuery(params: ParamsPaginados<ReportesConsumoQueryFilters>, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.reportesConsumo(params),
    queryFn: () =>
      paginado<ReporteConsumoRow>(`${BASE_ACOMPANAMIENTOS}/consumo/reportes`, params.filters, params.pageIndex, params.pageSize),
    enabled: enabled && params.filters != null,
    retry: false,
    placeholderData: (prev) => prev,
  })
}

/** `GET /acompanamientos/consumo/reportes/:ID` → `datos`. Abrirlo lo pasa a Recibido y deja traza: no se cachea. */
export function useReporteConsumoQuery(reporteId: number | undefined) {
  return useQuery({
    queryKey: prevencionKeys.reporteConsumo(reporteId ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_ACOMPANAMIENTOS}/consumo/reportes/${reporteId}`)
        .then((r) => desenvolver<ReporteConsumoDetalle>(r[0], "datos", "No se encontró el reporte.")),
    enabled: reporteId != null,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  })
}

/** `GET /acompanamientos/opciones/contexto?MATRICULA=` → `datos`: contexto de Cobertura antes de guardar (orientación). */
export function useContextoMatriculaQuery(matricula: number | undefined, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.opciones.acompContexto(matricula ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_ACOMPANAMIENTOS}/opciones/contexto${queryString({ MATRICULA: matricula })}`)
        .then((r) => desenvolver<ContextoAcompanamiento>(r[0], "datos", "No se encontró la matrícula.")),
    enabled: enabled && matricula != null,
    retry: false,
    staleTime: 60_000,
  })
}
