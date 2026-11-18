import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { downloadReport } from "@/lib/report-client"
import { toPaginated } from "@/lib/pagination"

import type {
  Convocatoria,
  ConvocatoriaInput,
  ListaSorteo,
  OpcionesConvocatoria,
  ResultadoSeleccion,
  SeleccionCupo,
} from "@/features/coverage/matricula-complementaria/api/types"

// Convocatorias de la matrícula complementaria (Sección 2.16.2). Pendiente en
// el back (docs/matricula/pendientes-back.md, tarea 12). Las filas llegan en
// snake_case y se pasan a camelCase con `camelizar`: los nombres de cada
// campo están en el doc de pendientes.

const BASE = "/cobertura-academica/matricula-complementaria/convocatorias"

const all = ["matricula-complementaria", "convocatorias"] as const
const detalle = (id: number | "none") => [...all, id] as const
export const convocatoriaKeys = {
  all,
  lista: <P>(params: P) => [...all, "lista", params] as const,
  opciones: (anio: number) => [...all, "opciones", anio] as const,
  detalle,
  seleccion: (id: number | "none", cupoId: number | null) => [...detalle(id), "seleccion", cupoId] as const,
  resultado: (id: number) => [...detalle(id), "resultado"] as const,
  sorteo: (id: number, cupoId: number | null) => [...detalle(id), "sorteo", cupoId] as const,
}

const aCamel = (k: string) => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())

/** snake_case → camelCase en profundidad (las filas del back son JSON plano). */
export function camelizar<T>(valor: unknown): T {
  if (Array.isArray(valor)) return valor.map((v) => camelizar(v)) as T
  if (valor && typeof valor === "object")
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [aCamel(k), camelizar(v)])) as T
  return valor as T
}

export interface ConvocatoriasParams {
  pageIndex: number
  pageSize: number
  sorting: { id: string; desc: boolean }[]
}

export function useConvocatoriasQuery(params: ConvocatoriasParams) {
  return useQuery({
    queryKey: convocatoriaKeys.lista(params),
    queryFn: async () => {
      const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>(`${BASE}/query`, {
        PAGE_INDEX: params.pageIndex,
        PAGE_SIZE: params.pageSize,
        SORTING: params.sorting[0] ? { ID: params.sorting[0].id, DESC: params.sorting[0].desc } : { ID: "anio", DESC: true },
      })
      return toPaginated(rows, { pageSize: params.pageSize, map: (r) => camelizar<Convocatoria>(r) })
    },
    placeholderData: keepPreviousData,
  })
}

export function useConvocatoriaQuery(id: number | null) {
  return useQuery({
    queryKey: convocatoriaKeys.detalle(id ?? "none"),
    queryFn: async () => camelizar<Convocatoria>(await evalCol.getRow(`${BASE}/${id}`)),
    enabled: id != null,
  })
}

export function useOpcionesConvocatoriaQuery(anio: number) {
  return useQuery({
    queryKey: convocatoriaKeys.opciones(anio),
    queryFn: async () => camelizar<OpcionesConvocatoria>(await evalCol.getRow(`${BASE}/opciones?ANIO=${anio}`)),
  })
}

const toBody = (v: ConvocatoriaInput) => ({
  ANIO: v.anio,
  ORIGENES: v.origenIds,
  FORMA_POSTULACION: v.forma,
  CONTINUIDAD_AUTOMATICA: v.continuidadAutomatica ? "S" : "N",
  LISTA_ESPERA: v.listaEspera ? "S" : "N",
  MODO_SELECCION: v.modo,
  DESEMPATE: v.desempate,
  FECHA_INICIO_POSTULACION: v.inicioPostulacion,
  FECHA_CIERRE_POSTULACION: v.cierrePostulacion,
  FECHA_PUBLICACION: v.publicacion,
  FECHA_LIMITE_MATRICULA: v.limiteMatricula,
  CUPOS: v.cupos.map((c) => ({
    ID: c.id,
    FK_TPERIODO_ACADEMICO: c.periodoId,
    FK_TGRADO: c.gradoId,
    FK_ESPECIALIDAD: c.especialidadId,
    CUPO: c.cupo,
  })),
})

export function useGuardarConvocatoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: ConvocatoriaInput }) =>
      id == null
        ? evalCol.postRow<{ pk_convocatoria: number }>(BASE, toBody(input))
        : evalCol.putRow<{ pk_convocatoria: number }>(`${BASE}/${id}`, toBody(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: convocatoriaKeys.all }),
  })
}

export function useEliminarConvocatoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => evalCol.put(`${BASE}/${id}/eliminar`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: convocatoriaKeys.all }),
  })
}

export function useSeleccionCupoQuery(id: number, cupoId: number | null) {
  return useQuery({
    queryKey: convocatoriaKeys.seleccion(id, cupoId),
    queryFn: async () => camelizar<SeleccionCupo>(await evalCol.getRow(`${BASE}/${id}/seleccion?FK_CUPO=${cupoId}`)),
    enabled: cupoId != null,
  })
}

export function useSeleccionar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cupoId }: { id: number; cupoId: number }) =>
      evalCol.postRow<{ registrados: number; en_lista_espera: number }>(`${BASE}/${id}/seleccionar`, { FK_CUPO: cupoId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: convocatoriaKeys.all }),
  })
}

export function useResultadoQuery(id: number) {
  return useQuery({
    queryKey: convocatoriaKeys.resultado(id),
    queryFn: async () => camelizar<ResultadoSeleccion>(await evalCol.getRow(`${BASE}/${id}/resultado`)),
  })
}

export function useListaSorteoQuery(id: number, cupoId: number | null) {
  return useQuery({
    queryKey: convocatoriaKeys.sorteo(id, cupoId),
    queryFn: async () => camelizar<ListaSorteo>(await evalCol.getRow(`${BASE}/${id}/sorteo?FK_CUPO=${cupoId}`)),
    enabled: cupoId != null,
  })
}

export function useDescargarListaSorteo() {
  return useMutation({
    // Como los demás reportes: clave `matricula-complementaria-sorteo` del reporting-service
    // (V459, POST .../convocatorias/sorteo/reporte con los filtros bajo `filters`).
    mutationFn: async ({ id, cupoId, formato }: { id: number; cupoId: number; formato: "pdf" | "excel" }) => {
      const r = await downloadReport("matricula-complementaria-sorteo", {
        format: formato,
        filters: { CONVOCATORIA: id, CUPO: cupoId },
      })
      if (r.status === "error") throw new Error(r.message)
      return r
    },
  })
}
