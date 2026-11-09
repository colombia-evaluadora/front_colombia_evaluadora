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

export function useConservacionConfigQuery() {
  return useQuery({
    queryKey: conservacionKeys.config,
    queryFn: () => resultado<ConservacionConfig>("/config", { almacenamientoArchivo: false }),
  })
}

/** Módulos de la Sección 4.1 para el selector de la política. */
export function useModulosQuery() {
  return useQuery({
    queryKey: conservacionKeys.modulos,
    queryFn: () => resultado<ModuloOpcion[]>("/modulos", []),
    staleTime: Infinity,
  })
}

// Una fila por tipo de registro: orden y página se resuelven en el front.
export function usePoliticasQuery() {
  return useQuery({
    queryKey: conservacionKeys.politicas,
    queryFn: () => resultado<Politica[]>("/politicas", []),
  })
}

export function usePoliticaQuery(id: number | null) {
  return useQuery({
    queryKey: conservacionKeys.politica(id ?? "none"),
    queryFn: async () =>
      (await evalCol.getRow<Resultado<Politica>>(`${CONSERVACION_BASE}/politicas/${id}`)).resultado,
    enabled: id != null,
  })
}

/** Sin establecimiento el back usa el del usuario (Administrador y Gestor). */
export function useAmpliacionesQuery(pkEstablecimiento: number | null, enabled = true) {
  const q = pkEstablecimiento ? `?PK_ESTABLECIMIENTO=${pkEstablecimiento}` : ""
  return useQuery({
    queryKey: conservacionKeys.ampliaciones(pkEstablecimiento),
    queryFn: () => resultado<Ampliacion[]>(`/ampliaciones${q}`, []),
    enabled,
  })
}

/** Solo Superadministrador: el back responde 403 a los demás. */
export function useVencidosQuery(enabled = true) {
  return useQuery({
    queryKey: conservacionKeys.vencidos,
    queryFn: () => resultado<Vencido[]>("/vencidos", []),
    enabled,
  })
}

export function useDetalleVencidoQuery(vencido: Vencido | null) {
  return useQuery({
    queryKey: conservacionKeys.detalleVencido(vencido?.pkPolitica ?? 0, vencido?.pkEstablecimiento ?? 0),
    queryFn: () =>
      resultado<RegistroVencido[]>(`/vencidos/${vencido?.pkPolitica}/${vencido?.pkEstablecimiento}`, []),
    enabled: vencido != null,
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
