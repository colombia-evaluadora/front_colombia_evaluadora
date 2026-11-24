import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { conservacionKeys } from "@/features/administration/conservacion-datos/api/query-keys"
import type {
  Ampliacion,
  Archivado,
  ConservacionConfig,
  ModuloOpcion,
  Politica,
  RegistroVencido,
  Resultado,
  Vencido,
} from "@/features/administration/conservacion-datos/api/types"

export const CONSERVACION_BASE = "/conservacion-datos"

async function resultado<T>(url: string, vacio: T) {
  const [row] = await evalCol.getRows<Resultado<T>>(`${CONSERVACION_BASE}${url}`)
  return row?.resultado ?? vacio
}

export const fetchConservacionConfig = () => resultado<ConservacionConfig>("/config", { almacenamientoArchivo: false })
export const fetchModulos = () => resultado<ModuloOpcion[]>("/modulos", [])
/** Los que el usuario puede elegir: todos para el Superadministrador, los suyos para el resto. */
export const fetchEstablecimientosConservacion = () =>
  resultado<{ id: number; name: string }[]>("/establecimientos", [])
export const fetchPoliticas = () => resultado<Politica[]>("/politicas", [])
export const fetchPolitica = async (id: number) =>
  (await evalCol.getRow<Resultado<Politica>>(`${CONSERVACION_BASE}/politicas/${id}`)).resultado
export const fetchAmpliaciones = (pkEstablecimiento: number | null) =>
  resultado<Ampliacion[]>(`/ampliaciones${pkEstablecimiento ? `?PK_ESTABLECIMIENTO=${pkEstablecimiento}` : ""}`, [])
export const fetchVencidos = () => resultado<Vencido[]>("/vencidos", [])
export const fetchDetalleVencido = (pkPolitica: number, pkEstablecimiento: number) =>
  resultado<RegistroVencido[]>(`/vencidos/${pkPolitica}/${pkEstablecimiento}`, [])

export function useConservacionConfigQuery() {
  return useQuery({
    queryKey: conservacionKeys.config,
    queryFn: fetchConservacionConfig,
  })
}

/** Módulos de la Sección 4.1 para el selector de la política. */
export function useModulosQuery() {
  return useQuery({
    queryKey: conservacionKeys.modulos,
    queryFn: fetchModulos,
    staleTime: Infinity,
  })
}

// Una fila por tipo de registro: orden y página se resuelven en el front.
export function usePoliticasQuery() {
  return useQuery({
    queryKey: conservacionKeys.politicas,
    queryFn: fetchPoliticas,
  })
}

export function usePoliticaQuery(id: number | null) {
  return useQuery({
    queryKey: conservacionKeys.politica(id ?? "none"),
    queryFn: () => fetchPolitica(id as number),
    enabled: id != null,
  })
}

/** Sin establecimiento el back usa el del usuario (Administrador y Gestor). */
export function useAmpliacionesQuery(pkEstablecimiento: number | null, enabled = true) {
  return useQuery({
    queryKey: conservacionKeys.ampliaciones(pkEstablecimiento),
    queryFn: () => fetchAmpliaciones(pkEstablecimiento),
    enabled,
  })
}

/** Solo Superadministrador: el back responde 403 a los demás. */
export function useVencidosQuery(enabled = true) {
  return useQuery({
    queryKey: conservacionKeys.vencidos,
    queryFn: fetchVencidos,
    enabled,
  })
}

export function useDetalleVencidoQuery(pkPolitica: number, pkEstablecimiento: number) {
  return useQuery({
    queryKey: conservacionKeys.detalleVencido(pkPolitica, pkEstablecimiento),
    queryFn: () => fetchDetalleVencido(pkPolitica, pkEstablecimiento),
    enabled: pkPolitica > 0 && pkEstablecimiento > 0,
  })
}

export interface ArchivoParams {
  q?: string
  pkEstablecimiento?: number
  tipoRegistro?: string
  anio?: number
  page: number
  pageSize: number
}

// El índice crece sin tope: se pagina y filtra en el back.
export function useArchivoQuery(params: ArchivoParams) {
  return useQuery({
    queryKey: conservacionKeys.archivo(params),
    // POST: cada consulta queda en la Bitácora.
    queryFn: async () => {
      const row = await evalCol.postRow<Resultado<{ total: number; filas: Archivado[] }>>(
        `${CONSERVACION_BASE}/archivo/consultar`,
        {
          BUSCAR: params.q || null,
          PK_ESTABLECIMIENTO: params.pkEstablecimiento ?? null,
          TIPO_REGISTRO: params.tipoRegistro || null,
          ANIO: params.anio ?? null,
          PAGE_INDEX: params.page,
          PAGE_SIZE: params.pageSize,
        },
      )
      return row.resultado
    },
    placeholderData: keepPreviousData,
  })
}

export function useEstablecimientosConservacionQuery() {
  return useQuery({
    queryKey: conservacionKeys.establecimientos,
    queryFn: fetchEstablecimientosConservacion,
    staleTime: 1000 * 60 * 5,
  })
}
