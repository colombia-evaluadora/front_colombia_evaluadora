import { TTL_OFFLINE, offlineMeta } from "@/lib/offline/query-meta"
import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { NOTIFICACIONES_ENDPOINTS } from "@/features/notificaciones/api/endpoints"
import type { Preferencias, PreferenciasRow } from "@/features/notificaciones/api/types"

export const preferenciasQueryKey = ["notificaciones", "preferencias"] as const

export const toPreferencias = (row: PreferenciasRow): Preferencias => {
  const horario = row?.horario_silencioso
  return {
    tipos: (row?.tipos ?? []).map((t) => ({
      tipo: t.tipo,
      categoria: t.categoria,
      etiqueta: t.etiqueta || t.tipo,
      push: Boolean(t.push),
      email: Boolean(t.email),
      silenciable: t.silenciable !== false,
      pushBloqueado: Boolean(t.push_bloqueado),
      emailBloqueado: Boolean(t.email_bloqueado),
      silenciadoHasta: t.silenciado_hasta ?? null,
    })),
    horarioSilencioso: {
      activo: Boolean(horario?.activo),
      desde: horario?.desde ?? "22:00",
      hasta: horario?.hasta ?? "06:00",
      dias: horario?.dias ?? [1, 2, 3, 4, 5, 6, 7],
      zona: horario?.zona || "America/Bogota",
      bloqueado: Boolean(horario?.bloqueado),
    },
  }
}

export async function fetchPreferencias(): Promise<Preferencias> {
  return toPreferencias(await api.get<PreferenciasRow>(NOTIFICACIONES_ENDPOINTS.preferencias()))
}

export function usePreferenciasQuery() {
  return useQuery({ queryKey: preferenciasQueryKey, queryFn: fetchPreferencias, meta: offlineMeta(TTL_OFFLINE.detalle) })
}
