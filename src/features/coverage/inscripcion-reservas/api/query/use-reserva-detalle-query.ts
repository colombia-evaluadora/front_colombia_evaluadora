import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import {
  RESERVAS_BASE,
  reservasCupoKeys,
} from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import type {
  DestinoTraslado,
  GrupoConCupo,
  ReservaCupoDetalle,
  UbicacionDestino,
  UbicacionReserva,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

const detalle = (id: string) => [...reservasCupoKeys.all, "detalle", id] as const

export const reservaKeys = {
  detalle,
  ubicaciones: (id: string) => [...detalle(id), "ubicaciones"] as const,
  destinos: (id: string) => [...detalle(id), "destinos"] as const,
  destinoUbicaciones: (id: string, destino: number | "none") =>
    [...detalle(id), "destino-ubicaciones", destino] as const,
  grupos: (id: string) => [...detalle(id), "grupos"] as const,
}

const datos = <T>(rows: { datos: T | null }[]): T | null => rows[0]?.datos ?? null

// --- Conectado al back real (V510) -----------------------------------------

/** Fila de `fn_reserva_ubicaciones` (snake_case). */
interface UbicacionRow {
  fk_tgrado: number
  fk_tperiodo_academico: number
  fk_tsede: number
  sede: string
  fk_tlv_jornada: number
  jornada: string
  cupo_disponible: number
}

/**
 * Sedes y jornadas del establecimiento con el grado de la reserva y su cupo:
 * opciones de Cambiar jornada o sede, Reservar cupo y Aceptar traslado.
 */
export function useUbicacionesReservaQuery(id: string | null) {
  return useQuery({
    queryKey: reservaKeys.ubicaciones(id ?? "none"),
    queryFn: async (): Promise<UbicacionReserva[]> => {
      const rows = await evalCol.getRows<{ datos: UbicacionRow[] | null }>(
        `${RESERVAS_BASE}/${id}/ubicaciones`,
      )
      return (datos(rows) ?? []).map((u) => ({
        fkTgrado: u.fk_tgrado,
        fkTperiodoAcademico: u.fk_tperiodo_academico,
        fkTsede: u.fk_tsede,
        sede: u.sede,
        fkTlvJornada: u.fk_tlv_jornada,
        jornada: u.jornada,
        cupoDisponible: u.cupo_disponible,
      }))
    },
    enabled: Boolean(id),
  })
}

/** Establecimientos de destino del traslado (Regla 78), sin el de la reserva. */
export function useDestinosTrasladoQuery(id: string | null) {
  return useQuery({
    queryKey: reservaKeys.destinos(id ?? "none"),
    queryFn: async (): Promise<DestinoTraslado[]> => {
      const rows = await evalCol.getRows<{
        datos: { pk_establecimiento: number; nombre: string; oficial: boolean }[] | null
      }>(`${RESERVAS_BASE}/${id}/traslado/destinos`)
      return (datos(rows) ?? []).map((d) => ({
        id: d.pk_establecimiento,
        nombre: d.nombre,
        oficial: d.oficial,
      }))
    },
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  })
}

/** Sedes y jornadas del destino que ofrecen el grado de la reserva (sin su cupo). */
export function useUbicacionesDestinoQuery(id: string | null, destino: number | null) {
  return useQuery({
    queryKey: reservaKeys.destinoUbicaciones(id ?? "none", destino ?? "none"),
    queryFn: async (): Promise<UbicacionDestino[]> =>
      datos(
        await evalCol.getRows<{ datos: UbicacionDestino[] | null }>(
          `${RESERVAS_BASE}/${id}/traslado/destino-ubicaciones?DESTINO=${destino}`,
        ),
      ) ?? [],
    enabled: Boolean(id) && destino != null,
  })
}

// --- Todavía contra MSW (Ver detalle y Asignar grupo) -----------------------

export function useReservaDetalleQuery(id: string | null) {
  return useQuery({
    queryKey: reservaKeys.detalle(id ?? "none"),
    queryFn: () => api.get<ReservaCupoDetalle>(`/coverage/reservas-cupo/${id}`),
    enabled: Boolean(id),
  })
}

export function useGruposConCupoQuery(id: string | null) {
  return useQuery({
    queryKey: reservaKeys.grupos(id ?? "none"),
    queryFn: () => api.get<GrupoConCupo[]>(`/coverage/reservas-cupo/${id}/grupos`),
    enabled: Boolean(id),
  })
}

/** Especialidades de Asignar grupo (el resto de catálogos de acciones ya viene del back real). */
export function useCatalogosAccionesQuery() {
  return useQuery({
    queryKey: [...reservasCupoKeys.all, "catalogos-acciones"] as const,
    queryFn: () =>
      api.get<{ especialidades: string[] }>("/coverage/reservas-cupo/catalogos-acciones"),
    staleTime: Infinity,
  })
}

/** Grupos con cupo para TODAS las reservas marcadas (incluido el cupo contratado). */
export function useGruposConCupoLoteQuery(ids: string[], enabled: boolean) {
  return useQuery({
    queryKey: [...reservasCupoKeys.all, "grupos-lote", ids] as const,
    queryFn: () => api.query<GrupoConCupo[]>("/coverage/reservas-cupo/grupos-lote", { ids }),
    enabled: enabled && ids.length > 0,
  })
}
