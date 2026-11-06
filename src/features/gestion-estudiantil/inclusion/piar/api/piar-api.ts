import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"
import { toPageCount } from "@/lib/pagination"
import { downloadReport } from "@/lib/report-client"

import type {
  AsignaturaOpcion,
  ParticipanteOpcion,
  PeriodoEvaluacionOpcion,
  PiarDetalle,
  PiarFiltros,
  PiarHistorial,
  PiarRow,
  SinPiarRow,
} from "@/features/gestion-estudiantil/inclusion/piar/api/types"

export const BASE = "/gestion-estudiantil/inclusion"
const PIAR = `${BASE}/piar`

export const piarKeys = {
  all: ["piar"] as const,
  lista: (params: unknown) => ["piar", "lista", params] as const,
  aviso: (sede: string, jornada: string) => ["piar", "aviso", sede, jornada] as const,
  detalle: (id: number) => ["piar", "detalle", id] as const,
  historial: (id: number) => ["piar", "historial", id] as const,
  opciones: (id: number, tipo: string, extra?: number) => ["piar", "opciones", id, tipo, extra] as const,
}

const id = (value: string) => (value ? Number(value) : null)

export function toPiarFilters(search: string, f: PiarFiltros) {
  return {
    SEARCH: search.trim() || null,
    FK_SEDE: id(f.sede),
    FK_JORNADA: id(f.jornada),
    FK_GRUPO: id(f.grupo),
    FK_ESTADO: id(f.estado),
    CONDICION: f.condicion || null,
    CON_PENDIENTES: f.pendientes ? f.pendientes === "SI" : null,
  }
}

export function usePiarListaQuery(params: { search: string; filtros: PiarFiltros; pageIndex: number; pageSize: number }) {
  return useQuery({
    queryKey: piarKeys.lista(params),
    queryFn: async () => {
      const rows = await evalCol.postRows<PiarRow>(`${PIAR}/query`, {
        FILTERS: toPiarFilters(params.search, params.filtros),
        PAGEINDEX: params.pageIndex,
        PAGESIZE: params.pageSize,
      })
      const totalCount = rows[0]?.total_count ?? 0
      return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
    },
    placeholderData: keepPreviousData,
  })
}

export function useSinPiarQuery(sede = "", jornada = "") {
  return useQuery({
    queryKey: piarKeys.aviso(sede, jornada),
    queryFn: () => {
      const q = new URLSearchParams()
      if (sede) q.set("FK_SEDE", sede)
      if (jornada) q.set("FK_JORNADA", jornada)
      const qs = q.toString()
      return evalCol.getRows<SinPiarRow>(`${PIAR}/aviso-sin-piar${qs ? `?${qs}` : ""}`)
    },
    staleTime: 60_000,
  })
}

/** Las funciones que devuelven JSONB llegan como `{ resultado }` en una sola fila. */
const piarQueryOptions = (piarId: number) => ({
  queryKey: piarKeys.detalle(piarId),
  queryFn: () => evalCol.getRow<{ resultado: PiarDetalle }>(`${PIAR}/${piarId}`).then((r) => r.resultado),
})

export function usePiarQuery(piarId: number) {
  return useQuery(piarQueryOptions(piarId))
}

export function usePiarHistorialQuery(piarId: number) {
  return useQuery({
    queryKey: piarKeys.historial(piarId),
    queryFn: () => evalCol.getRow<{ resultado: PiarHistorial }>(`${PIAR}/${piarId}/historial`).then((r) => r.resultado),
  })
}

export function useAsignaturasPiarQuery(piarId: number, enabled = true) {
  return useQuery({
    queryKey: piarKeys.opciones(piarId, "asignaturas"),
    queryFn: () => evalCol.getRows<AsignaturaOpcion>(`${PIAR}/${piarId}/opciones/asignaturas`),
    enabled,
  })
}

export function usePeriodosPiarQuery(piarId: number, ajuste: number | undefined) {
  return useQuery({
    queryKey: piarKeys.opciones(piarId, "periodos", ajuste),
    queryFn: () => evalCol.getRows<PeriodoEvaluacionOpcion>(`${PIAR}/${piarId}/opciones/periodos-evaluacion?AJUSTE=${ajuste}`),
    enabled: ajuste != null,
  })
}

export function useParticipantesOpcionQuery(piarId: number, enabled: boolean) {
  return useQuery({
    queryKey: piarKeys.opciones(piarId, "participantes"),
    queryFn: () => evalCol.getRows<ParticipanteOpcion>(`${PIAR}/${piarId}/opciones/participantes`),
    enabled,
  })
}

/** `POST /soporte` (file-service, V605): devuelve el `pk_tarchivo` que luego va en el endpoint de negocio. */
export async function subirSoportePiar(file: File): Promise<number> {
  const raw = await postMultipart<{ rows?: Record<string, unknown>[] } | Record<string, unknown>>(
    `/eval-col${BASE}/soporte`,
    {},
    { SOPORTE: file },
  )
  const fila = (raw && "rows" in raw && Array.isArray(raw.rows) ? raw.rows[0] : raw) as Record<string, unknown>
  const pk = fila?.pk_tarchivo
  if (typeof pk !== "number") throw new Error("No se pudo cargar el soporte.")
  return pk
}

export interface Operacion {
  method: "post" | "put" | "patch"
  /** Relativa a `/gestion-estudiantil/inclusion/piar`. */
  url: string
  body?: unknown
}

export const enviar = ({ method, url, body }: Operacion) => api[method](`/eval-col${PIAR}${url}`, body ?? {})

/** Toda escritura del expediente recalcula lista, ficha, historial y opciones: las reglas cruzan bloques. */
export function usePiarMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: enviar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: piarKeys.all }),
  })
}

/** Forma corta para los modales: `ejecutar("post", "/1/cerrar", cuerpo)`. */
export function useEjecutarPiar() {
  const { mutateAsync } = usePiarMutation()
  return (method: Operacion["method"], url: string, body?: unknown) => mutateAsync({ method, url, body })
}

/** Al pasar sobre una fila: la ficha abre sin esperar. */
export function usePrefetchPiar() {
  const queryClient = useQueryClient()
  return (piarId: number) => queryClient.prefetchQuery({ ...piarQueryOptions(piarId), staleTime: 30_000 })
}

export const descargarPlan = (piarId: number) => downloadReport("piar-plan", { format: "pdf", filters: { FK_PIAR: piarId } })

export const descargarActa = (piarId: number, versionId?: number) =>
  downloadReport("piar-acta", { format: "pdf", filters: { FK_PIAR: piarId, FK_VERSION: versionId ?? null } })

export const descargarActualizacion = (actualizacionId: number) =>
  downloadReport("piar-actualizacion", { format: "pdf", filters: { FK_ACTUALIZACION: actualizacionId } })
