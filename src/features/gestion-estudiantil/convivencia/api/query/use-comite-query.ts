import { useEffect, useMemo, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import type {
  CasoSeleccionable,
  ComiteDetalle,
  EstudianteComite,
  FuncionarioComite,
  PeriodoComite,
  QuorumVistaPrevia,
  SesionDetalle,
  SesionFila,
} from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import type { OrdenServidor } from "@/features/gestion-estudiantil/commons/utils/orden-servidor"
import { comiteKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"
import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"

const BASE = "/gestion-estudiantil/convivencia/comite"
const LIMITE = 50
const MIN_BUSQUEDA_ESTUDIANTE = 2

export const fetchPeriodosComite = () =>
  evalCol.getRows<PeriodoComite>(`${BASE}/periodos`)

/** `GET /comite/periodos`: períodos del establecimiento, primero los abiertos. */
export function usePeriodosComiteQuery() {
  return useQuery({
    queryKey: comiteKeys.periodos(),
    queryFn: fetchPeriodosComite,
    staleTime: 60_000,
  })
}

export const fetchComite = (periodo: number | null | undefined) =>
  evalCol
    .getRows<Record<string, unknown>>(`${BASE}/periodo/${periodo}`)
    .then((r) => desenvolver<ComiteDetalle>(r[0], "comite", "No se encontró el comité del período."))

/** `GET /comite/periodo/:PERIODO`: integrantes, cargos vacíos y avisos del Comité del período. */
export function useComiteQuery(periodo: number | null | undefined) {
  return useQuery({
    queryKey: comiteKeys.detalle(periodo ?? "none"),
    queryFn: () => fetchComite(periodo),
    enabled: periodo != null,
  })
}

export interface SesionesParams {
  comite: number | null | undefined
  filters: { FK_TLV_TIPO?: number | null; SEARCH?: string }
  pageIndex: number
  pageSize: number
  orden?: OrdenServidor
}

export const fetchSesionesComite = async ({ comite, filters, pageIndex, pageSize, orden }: SesionesParams) => {
  const rows = await evalCol.postRows<SesionFila>(`${BASE}/${comite}/sesiones/query`, { filters, pageIndex, pageSize, ...orden })
  const totalCount = rows[0]?.total_count ?? 0
  return { rows, totalCount, pageCount: toPageCount(totalCount, pageSize) }
}

/** `POST /comite/:ID/sesiones/query`: sesiones del Comité, paginadas. */
export function useSesionesQuery({ comite, filters, pageIndex, pageSize, orden }: SesionesParams) {
  return useQuery({
    queryKey: comiteKeys.sesiones({ comite, filters, pageIndex, pageSize, orden }),
    queryFn: () => fetchSesionesComite({ comite, filters, pageIndex, pageSize, orden }),
    enabled: comite != null,
    placeholderData: keepPreviousData,
  })
}

export const fetchSesionComite = (id: number | null | undefined) =>
  evalCol
    .getRows<Record<string, unknown>>(`${BASE}/sesiones/${id}`)
    .then((r) => desenvolver<SesionDetalle>(r[0], "sesion", "No se encontró la sesión."))

/** `GET /comite/sesiones/:ID`: detalle de una sesión (ver y editar). */
export function useSesionQuery(id: number | null | undefined) {
  return useQuery({
    queryKey: comiteKeys.sesion(id ?? "none"),
    queryFn: () => fetchSesionComite(id),
    enabled: id != null,
  })
}

/** `GET /comite/:ID/casos`: casos que se pueden tratar en una sesión. */
export function useCasosComiteQuery(comite: number | null | undefined, search: string, enabled = true) {
  const q = search.trim().slice(0, 100)
  return useQuery({
    queryKey: comiteKeys.casos(comite ?? "none", q),
    queryFn: () => evalCol.getRows<CasoSeleccionable>(`${BASE}/${comite}/casos${queryString({ SEARCH: q, LIMITE })}`),
    enabled: comite != null && enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

/** `GET /comite/:ID/funcionarios`: funcionarios para integrantes o responsables de seguimiento. */
export function useFuncionariosComiteQuery(
  periodo: number | null | undefined,
  { soloSeguimiento = false, search = "", enabled = true }: { soloSeguimiento?: boolean; search?: string; enabled?: boolean } = {},
) {
  const q = search.trim().slice(0, 100)
  return useQuery({
    queryKey: comiteKeys.funcionarios(periodo ?? "none", { soloSeguimiento, q }),
    queryFn: () =>
      evalCol.getRows<FuncionarioComite>(
        `${BASE}/periodo/${periodo}/funcionarios${queryString({ SOLO_SEGUIMIENTO: soloSeguimiento, SEARCH: q, LIMITE })}`,
      ),
    enabled: periodo != null && enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

/** `GET /comite/:ID/estudiantes`: la búsqueda necesita al menos 2 caracteres. */
export function useEstudiantesComiteQuery(periodo: number | null | undefined, search: string, enabled = true) {
  const q = search.trim().slice(0, 100)
  return useQuery({
    queryKey: comiteKeys.estudiantes(periodo ?? "none", q),
    queryFn: () => evalCol.getRows<EstudianteComite>(`${BASE}/periodo/${periodo}/estudiantes${queryString({ SEARCH: q, LIMITE })}`),
    enabled: periodo != null && enabled && q.length >= MIN_BUSQUEDA_ESTUDIANTE,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

/** El valor, con `espera` ms de retraso: la clave de la consulta no cambia a cada casilla marcada. */
function useDiferido<T>(valor: T, espera: number): T {
  const [diferido, setDiferido] = useState(valor)
  const huella = JSON.stringify(valor)
  useEffect(() => {
    const t = setTimeout(() => setDiferido(valor), espera)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huella, espera])
  return diferido
}

/**
 * `POST /comite/:ID/quorum`: vista previa del quórum de la sesión (Regla 23), calculada en el servidor.
 * La clave es estable (asistentes ordenados) y la consulta espera a que se deje de marcar.
 */
export function useQuorumQuery(comite: number | null | undefined, fecha: string, asistentes: number[], enabled = true) {
  const estables = useMemo(() => [...asistentes].sort((a, b) => a - b), [asistentes])
  const diferidos = useDiferido(estables, 400)
  return useQuery({
    queryKey: comiteKeys.quorum(comite ?? "none", fecha, diferidos),
    queryFn: () => evalCol.postRow<QuorumVistaPrevia>(`${BASE}/${comite}/quorum`, { FECHA: fecha, ASISTENTES: diferidos }),
    enabled: comite != null && Boolean(fecha) && enabled,
    placeholderData: keepPreviousData,
  })
}
