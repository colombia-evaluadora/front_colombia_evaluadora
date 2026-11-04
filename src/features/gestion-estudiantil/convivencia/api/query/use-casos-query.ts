import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { convivenciaKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"
import {
  SIN_GESTOR,
  type CasoDetalle,
  type CasoRow,
  type ConvivenciaFiltros,
  type ConvivenciaQueryFilters,
  type GestorCandidato,
  type GestorPrevisto,
  type PasoCaso,
} from "@/features/gestion-estudiantil/convivencia/api/types"

const BASE = "/gestion-estudiantil/convivencia"
const id = (value: string) => (value ? Number(value) : null)

export function toConvivenciaFilters(search: string, f: ConvivenciaFiltros): ConvivenciaQueryFilters {
  return {
    SEARCH: search.trim() || null,
    FK_SEDE: id(f.sede),
    FK_JORNADA: id(f.jornada),
    FK_TLV_TIPO: id(f.tipo),
    FK_TLV_ESTADO: id(f.estado),
    FK_GESTOR: f.gestor && f.gestor !== SIN_GESTOR ? Number(f.gestor) : null,
    SIN_GESTOR: f.gestor === SIN_GESTOR ? true : null,
    PENDIENTE_SIUCE: f.pendienteSiuce ? true : null,
  }
}

export interface CasosParams {
  filters: ConvivenciaQueryFilters
  pageIndex: number
  pageSize: number
}

/** `POST /casos/query`: el alcance (sedes y Tipo II/III) lo aplica el backend. */
export function useCasosQuery(params: CasosParams) {
  return useQuery({
    queryKey: convivenciaKeys.lista(params),
    queryFn: async () => {
      const rows = await evalCol.postRows<CasoRow>(`${BASE}/casos/query`, {
        FILTERS: params.filters,
        PAGEINDEX: params.pageIndex,
        PAGESIZE: params.pageSize,
      })
      const totalCount = rows[0]?.total_count ?? 0
      return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
    },
    placeholderData: (prev) => prev,
  })
}

/** El JSONB llega en la columna `caso`; según el motor, como objeto o como texto. */
function toDetalle(row: { caso: CasoDetalle | string } | undefined): CasoDetalle {
  const caso = row?.caso
  if (!caso) throw new Error("No se encontró el caso.")
  return typeof caso === "string" ? (JSON.parse(caso) as CasoDetalle) : caso
}

export function fetchCaso(casoId: number) {
  return evalCol.getRows<{ caso: CasoDetalle | string }>(`${BASE}/casos/${casoId}`).then((r) => toDetalle(r[0]))
}

/** `GET /casos/:ID`: detalle (Ver detalle, Modificar y los diálogos que necesitan estudiantes o fechas). */
export function useCasoQuery(casoId: number | undefined) {
  return useQuery({
    queryKey: convivenciaKeys.detalle(casoId ?? "none"),
    queryFn: () => fetchCaso(casoId!),
    enabled: casoId != null,
  })
}

/** `GET /casos/:ID/pasos`: pasos obligatorios del tipo con su estado. */
export function usePasosCasoQuery(casoId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: convivenciaKeys.pasos(casoId ?? "none"),
    queryFn: () => evalCol.getRows<PasoCaso>(`${BASE}/casos/${casoId}/pasos`),
    enabled: casoId != null && enabled,
  })
}

/** `GET /casos/:ID/gestores`: Supervisores de sede candidatos (Regla 27). */
export function useGestoresCasoQuery(casoId: number | undefined) {
  return useQuery({
    queryKey: convivenciaKeys.gestores(casoId ?? "none"),
    queryFn: () => evalCol.getRows<GestorCandidato>(`${BASE}/casos/${casoId}/gestores`),
    enabled: casoId != null,
  })
}

/** `POST /gestor-previsto`: a quién quedará asignado el caso que se está creando. */
export function useGestorPrevistoQuery(tipoId: number | null, matriculas: number[]) {
  return useQuery({
    queryKey: convivenciaKeys.gestorPrevisto(tipoId ?? "none", matriculas),
    queryFn: () =>
      evalCol
        .postRows<GestorPrevisto>(`${BASE}/gestor-previsto`, { FK_TLV_TIPO: tipoId, FK_MATRICULAS: matriculas })
        .then((r) => r[0] ?? null),
    enabled: tipoId != null && matriculas.length > 0,
  })
}
