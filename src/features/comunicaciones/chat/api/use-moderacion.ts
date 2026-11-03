import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"

export interface ReporteConversacion {
  id: number
  conversacionId: number
  conversacion: string
  reportanteId: number
  reportante: string
  motivo: string
  estado: "PENDIENTE" | "REVISADO"
  fecha: string
}

export interface SuspensionMensajeria {
  id: number
  usuarioId: number
  usuario: string
  motivo: string
  fecha: string
  venceEn: string | null
}

export interface ConfiguracionMensajeria {
  horaInicio: string | null
  horaFin: string | null
  incluyeSabado: boolean
}

const keys = {
  all: [...chatKeys.all, "moderacion"] as const,
  reportes: [...chatKeys.all, "moderacion", "reportes"] as const,
  mensajes: (id: number) => [...chatKeys.all, "moderacion", "reportes", id, "mensajes"] as const,
  suspensiones: [...chatKeys.all, "moderacion", "suspensiones"] as const,
  configuracion: [...chatKeys.all, "moderacion", "configuracion"] as const,
}

export function useReportarConversacion() {
  return useMutation({
    mutationFn: ({ conversacionId, motivo }: { conversacionId: number; motivo: string }) =>
      evalCol.postRow(`/comunicaciones/conversaciones/${conversacionId}/reportar`, { MOTIVO: motivo }),
  })
}

export function useReportesQuery(enabled: boolean) {
  return useQuery({
    queryKey: keys.reportes,
    queryFn: () => evalCol.getRows<ReporteConversacion>("/comunicaciones/moderacion/reportes"),
    enabled,
  })
}

/** Abrirla queda registrado en la Bitácora: solo se pide al elegir un reporte; sin caché reutilizable. */
export function useMensajesReportadosQuery(id: number | null) {
  return useQuery({
    queryKey: keys.mensajes(id ?? 0),
    queryFn: () => evalCol.getRows<Mensaje>(`/comunicaciones/moderacion/reportes/${id}/mensajes`),
    enabled: id != null,
    gcTime: 0,
  })
}

export function useRevisarReporte() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow(`/comunicaciones/moderacion/reportes/${id}/revisar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.reportes }),
  })
}

export function useSuspensionesQuery(enabled: boolean) {
  return useQuery({
    queryKey: keys.suspensiones,
    queryFn: () => evalCol.getRows<SuspensionMensajeria>("/comunicaciones/moderacion/suspensiones"),
    enabled,
  })
}

export function useSuspender() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { usuarioId: number; motivo: string; reporteId: number | null; venceEn: string | null }) =>
      evalCol.postRow("/comunicaciones/moderacion/suspensiones", {
        FK_USUARIO: v.usuarioId,
        MOTIVO: v.motivo,
        ...(v.reporteId != null && { FK_REPORTE: v.reporteId }),
        ...(v.venceEn && { VENCE_EN: v.venceEn }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.suspensiones }),
  })
}

export function useLevantarSuspension() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow(`/comunicaciones/moderacion/suspensiones/${id}/levantar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.suspensiones }),
  })
}

export function useConfiguracionQuery(enabled: boolean) {
  return useQuery({
    queryKey: keys.configuracion,
    queryFn: () => evalCol.getRows<ConfiguracionMensajeria>("/comunicaciones/moderacion/configuracion").then((r) => r[0]),
    enabled,
  })
}

export function useGuardarConfiguracion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (c: { horaInicio: string; horaFin: string; incluyeSabado: boolean }) =>
      evalCol.putRow<ConfiguracionMensajeria>("/comunicaciones/moderacion/configuracion", {
        HORA_INICIO: c.horaInicio,
        HORA_FIN: c.horaFin,
        INCLUYE_SABADO: c.incluyeSabado ? "S" : "N",
      }),
    onSuccess: (c) => queryClient.setQueryData(keys.configuracion, c),
  })
}
