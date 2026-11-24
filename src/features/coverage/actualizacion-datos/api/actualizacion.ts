import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPaginated } from "@/lib/pagination"

import { camelizar } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import type { ActualizacionDatosSearch } from "@/features/coverage/actualizacion-datos/api/schema"
import type { ConfiguracionActualizacion, SolicitudCorreccion } from "@/features/coverage/actualizacion-datos/api/types"

// Actualización de datos (Sección 2.19; Regla 69). Pendiente en el back
// (docs/matricula/pendientes-back.md, tarea 30).

export const MENU_ACTUALIZACION = "ACTUALIZACION_DATOS"
const BASE = "/cobertura-academica/actualizacion-datos"

const all = ["actualizacion-datos"] as const
export const actualizacionKeys = {
  all,
  configuracion: [...all, "configuracion"] as const,
  solicitudes: [...all, "solicitudes"] as const,
  lista: (p: unknown) => [...all, "solicitudes", "lista", p] as const,
  pendientes: [...all, "solicitudes", "pendientes"] as const,
}

export async function fetchConfiguracionActualizacion() {
  return camelizar<ConfiguracionActualizacion>(await evalCol.getRow(`${BASE}/configuracion`))
}

export function useConfiguracionQuery() {
  return useQuery({
    queryKey: actualizacionKeys.configuracion,
    queryFn: fetchConfiguracionActualizacion,
  })
}

type FiltrosSolicitudes = Pick<ActualizacionDatosSearch, "q" | "estado">
type Pagina = { pageIndex: number; pageSize: number }

/** Filtros de la lista; los reusa el export (mismos que la tabla). */
export const filtrosSolicitudes = (s: FiltrosSolicitudes) => ({
  SEARCH: s.q || null,
  ESTADO: s.estado === "TODOS" ? null : (s.estado ?? "PENDIENTE"),
})

type Fila = Record<string, unknown> & { total_count: number }

/** Body de la lista: es también su key. */
export const cuerpoSolicitudes = (s: FiltrosSolicitudes, p: Pagina) => ({
  ...filtrosSolicitudes(s),
  PAGE_INDEX: p.pageIndex,
  PAGE_SIZE: p.pageSize,
})

export async function fetchSolicitudes(body: ReturnType<typeof cuerpoSolicitudes>) {
  const rows = await evalCol.postRows<Fila>(`${BASE}/solicitudes/query`, body)
  return toPaginated(rows, { pageSize: body.PAGE_SIZE, map: (r) => camelizar<SolicitudCorreccion>(r) })
}

export function useSolicitudesQuery(s: ActualizacionDatosSearch, p: Pagina) {
  const body = cuerpoSolicitudes(s, p)
  return useQuery({
    queryKey: actualizacionKeys.lista(body),
    queryFn: () => fetchSolicitudes(body),
    placeholderData: keepPreviousData,
  })
}

export async function fetchPendientesCount() {
  const rows = await evalCol.postRows<Fila>(`${BASE}/solicitudes/query`, { SEARCH: null, ESTADO: "PENDIENTE", PAGE_INDEX: 0, PAGE_SIZE: 1 })
  return Number(rows[0]?.total_count ?? 0)
}

/** Número de la pestaña: las Pendientes, con el mismo listado y una fila. */
export function usePendientesCountQuery() {
  return useQuery({
    queryKey: actualizacionKeys.pendientes,
    queryFn: fetchPendientesCount,
  })
}

function useMutacion<V>(fn: (v: V) => Promise<unknown>, key: readonly unknown[]) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export const useGuardarConfiguracion = () =>
  useMutacion(
    (c: ConfiguracionActualizacion) =>
      evalCol.putRow(`${BASE}/configuracion`, {
        ACTIVO: c.activo ? "S" : "N",
        FECHA_INICIO: c.fechaInicio,
        FECHA_CIERRE: c.fechaCierre,
        CAMPOS: c.campos.map((f) => ({ CODIGO: f.codigo, ACUDIENTE: f.acudiente === true ? "S" : "N", ESTUDIANTE: f.estudiante === true ? "S" : "N" })),
      }),
    actualizacionKeys.configuracion,
  )

/** Se aplica como corrección de datos de identidad (Regla 43), con el motivo y el soporte del solicitante. */
export const useAprobarSolicitud = () =>
  useMutacion((id: number) => evalCol.putRow(`${BASE}/solicitudes/${id}/aprobar`, {}), actualizacionKeys.solicitudes)

export const useRechazarSolicitud = () =>
  useMutacion(
    (v: { id: number; motivo: string }) => evalCol.putRow(`${BASE}/solicitudes/${v.id}/rechazar`, { MOTIVO: v.motivo }),
    actualizacionKeys.solicitudes,
  )
