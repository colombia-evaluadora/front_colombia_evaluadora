import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"
import { toSingleSort } from "@/lib/query-request-mapping"
import { fetchEstablecimientoId } from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import type {
  EstadoReserva,
  EstadoTraslado,
  OrigenReserva,
  PeriodoInscripciones,
  ReservaCupo,
  ReservasCupoCatalogos,
  ReservasCupoContadores,
  ReservasCupoQueryRequest,
  ReservasCupoQueryResponse,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

// Endpoints de sso V510. Los wrappers devuelven `SELECT fn(...) AS datos`: una fila con el JSON.
export const RESERVAS_BASE = "/cobertura-academica/reservas-cupo"

const all = ["reservas-cupo"] as const

export const reservasCupoKeys = {
  /** Prefijo de todo el feature: lo invalida cualquier acción sobre una reserva. */
  all,
  establecimiento: [...all, "establecimiento"] as const,
  lista: (ee: number | "none", params: ReservasCupoQueryRequest) =>
    [...all, "lista", ee, params] as const,
  catalogos: (ee: number | "none") => [...all, "catalogos", ee] as const,
}

/** Establecimiento de la pestaña: el primero de los del usuario (como Inscripciones). */
export function useEstablecimientoReservasQuery() {
  return useQuery({
    queryKey: reservasCupoKeys.establecimiento,
    queryFn: fetchEstablecimientoId,
    staleTime: Infinity,
  })
}

// --- Lista -------------------------------------------------------------------

/** Fila de `fn_reserva_listar_interno` (snake_case). */
interface ReservaCupoRow {
  pk_treserva_cupo: number
  entrante: boolean
  estudiante: string | null
  documento: string | null
  establecimiento_origen: string | null
  codigo_grado: string
  grado: string | null
  fk_tsede: number | null
  sede: string | null
  fk_tlv_jornada: number | null
  jornada: string | null
  fk_tperiodo_academico: number | null
  estado: EstadoReserva
  origen: OrigenReserva
  confirmada_acudiente: boolean
  estado_traslado: EstadoTraslado | null
  destino: string | null
  motivo_liberacion: string | null
}

interface ListadoRow {
  datos: { total: number; filas: ReservaCupoRow[]; contadores: ReservasCupoContadores }
}

const toReservaCupo = (r: ReservaCupoRow): ReservaCupo => ({
  id: String(r.pk_treserva_cupo),
  estudiante: r.estudiante ?? "",
  documento: r.documento ?? "",
  establecimientoOrigen: r.establecimiento_origen,
  grado: r.grado ?? r.codigo_grado,
  codigoGrado: r.codigo_grado,
  sede: r.sede ?? "",
  fkTsede: r.fk_tsede,
  jornada: r.jornada ?? "",
  fkTlvJornada: r.fk_tlv_jornada,
  periodoId: r.fk_tperiodo_academico,
  periodo: "",
  estado: r.estado,
  origen: r.origen,
  confirmadaPorAcudiente: Boolean(r.confirmada_acudiente),
  estadoTraslado: r.estado_traslado,
  destinoTraslado: r.destino,
  trasladoEntrante: Boolean(r.entrante),
  motivoLiberacion: r.motivo_liberacion,
})

/**
 * Filtros como los bindea V510. Exportado: lo reusará el export. El ciclo se
 * traduce a los períodos que lo forman (uno por sede y jornada). Lo vacío va
 * `undefined` (se omite del JSON): el validador rechaza hojas sin declarar.
 */
export function toReservasCupoFilters(
  { filters }: Pick<ReservasCupoQueryRequest, "filters">,
  periodos: PeriodoInscripciones[] = [],
) {
  const delCiclo = filters.ciclo
    ? periodos.filter((p) => p.grupoAdmisionId === filters.ciclo).map((p) => Number(p.id))
    : []
  return {
    SEARCH: filters.q?.trim() || undefined,
    FK_TSEDE: filters.sede ? Number(filters.sede) : undefined,
    FK_TLV_JORNADA: filters.jornada ? Number(filters.jornada) : undefined,
    // Un ciclo sin períodos todavía no debe traer todo: -1 no coincide con ninguno.
    PERIODOS: filters.ciclo ? (delCiclo.length ? delCiclo : [-1]) : undefined,
    CODIGO_GRADO: filters.grado || undefined,
    ESTADOS: filters.estado ? [filters.estado] : undefined,
    ESTADO_TRASLADO: filters.estadoTraslado,
    POR_CONFIRMAR: filters.porConfirmar || undefined,
    ENTRANTES: filters.entrantes || undefined,
  }
}

async function fetchReservasCupo(
  ee: number,
  params: ReservasCupoQueryRequest,
  periodos: PeriodoInscripciones[],
): Promise<ReservasCupoQueryResponse> {
  const sort = toSingleSort(params.sorting)
  const [row] = await evalCol.postRows<ListadoRow>(`${RESERVAS_BASE}/query`, {
    FK_TESTABLECIMIENTO: ee,
    FILTERS: toReservasCupoFilters(params, periodos),
    SORTING: { ID: sort.id, DESC: sort.desc },
    PAGEINDEX: params.pageIndex,
    PAGESIZE: params.pageSize,
  })
  const datos = row?.datos
  const totalCount = Number(datos?.total ?? 0)
  return {
    rows: (datos?.filas ?? []).map(toReservaCupo),
    totalCount,
    pageCount: toPageCount(totalCount, params.pageSize),
    contadores: datos?.contadores ?? {
      reservadas: 0,
      sinContinuidad: 0,
      porConfirmar: 0,
      trasladosPorResponder: 0,
    },
  }
}

export function useReservasCupoQuery(params: ReservasCupoQueryRequest) {
  const { data: ee } = useEstablecimientoReservasQuery()
  // El filtro de ciclo necesita los períodos; sin ciclo no se espera a los catálogos.
  const catalogos = useReservasCupoCatalogosQuery()
  const listo = ee != null && (!params.filters.ciclo || catalogos.data != null)
  return useQuery({
    queryKey: reservasCupoKeys.lista(ee ?? "none", params),
    queryFn: () => fetchReservasCupo(ee as number, params, catalogos.data?.periodos ?? []),
    enabled: listo,
    placeholderData: (previous) => previous,
  })
}

// --- Catálogos ---------------------------------------------------------------

interface CatalogosRow {
  datos: Omit<ReservasCupoCatalogos, "periodos"> & {
    periodos: (Omit<PeriodoInscripciones, "id" | "grupoAdmisionId"> & {
      id: number
      grupoAdmisionId: number
    })[]
  }
}

async function fetchCatalogos(ee: number): Promise<ReservasCupoCatalogos> {
  const { datos } = await evalCol.getRow<CatalogosRow>(
    `${RESERVAS_BASE}/establecimiento/${ee}/catalogos`,
  )
  return {
    ...datos,
    periodos: datos.periodos.map((p) => ({
      ...p,
      id: String(p.id),
      grupoAdmisionId: String(p.grupoAdmisionId),
    })),
  }
}

/** Períodos (ciclo, sede, jornada), grados y los motivos que admite cada acción. */
export function useReservasCupoCatalogosQuery() {
  const { data: ee } = useEstablecimientoReservasQuery()
  return useQuery({
    queryKey: reservasCupoKeys.catalogos(ee ?? "none"),
    queryFn: () => fetchCatalogos(ee as number),
    enabled: ee != null,
    staleTime: 5 * 60_000,
  })
}

/** Ciclos (grupos de admisión) de los períodos, del más reciente al más antiguo. */
export function ciclosDe(periodos: PeriodoInscripciones[] = []) {
  const vistos = new Map<string, string>()
  for (const p of periodos)
    if (!vistos.has(p.grupoAdmisionId)) vistos.set(p.grupoAdmisionId, p.ciclo)
  return [...vistos].map(([id, nombre]) => ({ id, nombre }))
}

/** Períodos en Inscripciones (los que procesa Reservar cupos). */
export function usePeriodosInscripcionesQuery() {
  const query = useReservasCupoCatalogosQuery()
  return { ...query, data: query.data?.periodos.filter((p) => p.estado === "I") }
}
